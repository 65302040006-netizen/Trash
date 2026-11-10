/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Star,
  Search,
  Filter,
  PackageCheck,
  X,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Submission, Redemption, TrashType } from '../types';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  runTransaction,
  increment,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatThaiDateTime } from '../utils/dateFormatter';
import { Mascot } from '../components/Mascot';

interface ReviewerDashboardProps {
  onBackToHome: () => void;
}

export const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ onBackToHome }) => {
  const { profile, settings } = useAuth();
  const [subTab, setSubTab] = useState<'submissions' | 'rewards'>('submissions');

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Reviewing modal
  const [inspectItem, setInspectItem] = useState<Submission | null>(null);
  const [approvedPieces, setApprovedPieces] = useState<number>(5);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Reward delivery state
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [delivering, setDelivering] = useState<string | null>(null);

  // Fetch pending submissions in realtime
  useEffect(() => {
    const q = query(
      collection(db, 'submissions'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Submission[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Submission, 'id'>) });
        });
        // FIFO: Oldest pending submission first
        list.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.error('Pending submissions listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch redemptions in realtime
  useEffect(() => {
    const q = query(collection(db, 'redemptions'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Redemption[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Redemption, 'id'>) });
        });
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRedemptions(list);
      },
      (err) => console.warn('Redemptions load warning:', err)
    );

    return () => unsubscribe();
  }, []);

  // Open inspection modal
  const handleOpenInspect = (item: Submission) => {
    setInspectItem(item);
    setApprovedPieces(item.pieces);
    setRejectReason('');
    setSelectedPresetReason('');
    setActionSuccessMsg('');
  };

  // Calculate points for approved pieces
  const calculatePoints = (item: Submission, piecesCount: number) => {
    const isRecycle = item.type === 'recycle' || item.type === 'paper';
    const rate = isRecycle
      ? settings.recyclePerPiece || 2
      : settings.generalPerPiece || 1;
    return piecesCount * rate;
  };

  // Approve Submission
  const handleApprove = async () => {
    if (!inspectItem || processing || !profile) return;
    setProcessing(true);

    try {
      const awardedPoints = calculatePoints(inspectItem, approvedPieces);
      const subRef = doc(db, 'submissions', inspectItem.id);
      const userRef = doc(db, 'users', inspectItem.userId);

      // Atomic transaction: update submission status & credit student points
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentBalance = userDoc.exists() ? userDoc.data().balance || 0 : 0;
        const currentTotal = userDoc.exists() ? userDoc.data().totalEarned || 0 : 0;
        const currentPieces = userDoc.exists() ? userDoc.data().totalPieces || 0 : 0;

        const newTotal = currentTotal + awardedPoints;
        const certificateEarned = newTotal >= (settings.certificateTarget || 100);

        transaction.update(subRef, {
          status: 'approved',
          approvedPieces: Number(approvedPieces),
          points: awardedPoints,
          reviewedBy: profile.uid,
          reviewerName: profile.name,
          reviewedAt: new Date().toISOString(),
        });

        transaction.update(userRef, {
          balance: currentBalance + awardedPoints,
          totalEarned: newTotal,
          totalPieces: currentPieces + Number(approvedPieces),
          certificateEarned,
        });
      });

      // Send notification to the student
      await addDoc(collection(db, 'notifications'), {
        userId: inspectItem.userId,
        type: 'points',
        title: 'หลักฐานขยะได้รับการอนุมัติ! 🎉',
        message: `ครูได้ตรวจสอบรายการ "${inspectItem.locationName}" เรียบร้อย อนุมัติ ${approvedPieces} ชิ้น ได้รับ +${awardedPoints} คะแนน`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      setActionSuccessMsg('อนุมัติและบันทึกคะแนนให้นักเรียนสำเร็จแล้ว!');
      setTimeout(() => {
        setInspectItem(null);
        setProcessing(false);
      }, 900);
    } catch (err) {
      console.error('Approve error:', err);
      setProcessing(false);
    }
  };

  // Reject Submission
  const handleReject = async () => {
    if (!inspectItem || processing || !profile) return;
    const finalReason = rejectReason.trim() || selectedPresetReason;
    if (!finalReason) {
      alert('กรุณาระบุเหตุผลที่ไม่ผ่าน');
      return;
    }

    setProcessing(true);

    try {
      const subRef = doc(db, 'submissions', inspectItem.id);
      await updateDoc(subRef, {
        status: 'rejected',
        rejectReason: finalReason,
        reviewedBy: profile.uid,
        reviewerName: profile.name,
        reviewedAt: new Date().toISOString(),
      });

      // Send notification to student
      await addDoc(collection(db, 'notifications'), {
        userId: inspectItem.userId,
        type: 'rejected',
        title: 'รายการเก็บขยะไม่ผ่านการตรวจสอบ ⚠️',
        message: `รายการที่ ${inspectItem.locationName} ไม่ผ่าน: "${finalReason}"`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      setActionSuccessMsg('บันทึกสถานะไม่ผ่านเรียบร้อย');
      setTimeout(() => {
        setInspectItem(null);
        setProcessing(false);
      }, 900);
    } catch (err) {
      console.error('Reject error:', err);
      setProcessing(false);
    }
  };

  // Deliver Reward
  const handleDeliverReward = async (redemptionId: string) => {
    if (!profile || delivering) return;
    setDelivering(redemptionId);
    try {
      const redRef = doc(db, 'redemptions', redemptionId);
      await updateDoc(redRef, {
        status: 'delivered',
        deliveredBy: profile.name,
        deliveredAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Deliver error:', err);
    } finally {
      setDelivering(null);
    }
  };

  const presetReasons = [
    'ภาพถ่ายไม่ชัดเจน หรือมืดเกินไป',
    'ไม่เห็นภาชนะหรือถังขยะที่ทิ้งจริง',
    'ประเภทขยะไม่ตรงกับที่ระบุในระบบ',
    'พบภาพถ่ายซ้ำซ้อนกับรายการก่อนหน้า',
    'ขยะถูกทิ้งไม่ถูกวิธี / วางทิ้งเรี่ยราด',
  ];

  const filteredSubmissions = submissions.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (classFilter !== 'all' && !s.className?.includes(classFilter)) return false;
    return true;
  });

  const filteredRedemptions = redemptions.filter((r) => {
    if (!searchCode.trim()) return true;
    const q = searchCode.toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.userName.toLowerCase().includes(q) ||
      r.rewardName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Reviewer Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-green-800 text-white rounded-3xl p-4.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-300">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mali">
                ระบบตรวจขยะ & ส่งมอบรางวัล
              </h2>
              <p className="text-[11px] text-emerald-100">
                สำหรับคุณครูและสภานักเรียน
              </p>
            </div>
          </div>
          <button
            onClick={onBackToHome}
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition"
          >
            กลับหน้าหลัก
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-emerald-950/40 p-1 rounded-2xl mt-3 text-xs">
          <button
            onClick={() => setSubTab('submissions')}
            className={`flex-1 py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1 ${
              subTab === 'submissions'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>รอตรวจสอบ ({submissions.length})</span>
          </button>
          <button
            onClick={() => setSubTab('rewards')}
            className={`flex-1 py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1 ${
              subTab === 'rewards'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>
              ส่งมอบของรางวัล (
              {redemptions.filter((r) => r.status === 'pending').length})
            </span>
          </button>
        </div>
      </div>

      {/* Subtab 1: Pending Submissions Queue */}
      {subTab === 'submissions' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 text-xs bg-white border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none"
            >
              <option value="all">ทุกประเภทขยะ</option>
              <option value="general">ขยะทั่วไป</option>
              <option value="recycle">ขวดพลาสติก/รีไซเคิล</option>
              <option value="paper">กระดาษ</option>
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="flex-1 text-xs bg-white border border-slate-200 rounded-xl p-2 text-slate-700 focus:outline-none"
            >
              <option value="all">ทุกระดับชั้น</option>
              <option value="ม.1">ชั้น ม.1</option>
              <option value="ม.2">ชั้น ม.2</option>
              <option value="ม.3">ชั้น ม.3</option>
              <option value="ม.4">ชั้น ม.4</option>
              <option value="ม.5">ชั้น ม.5</option>
              <option value="ม.6">ชั้น ม.6</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">
              กำลังโหลดรายการรอตรวจ...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-2">
              <Mascot mood="detective" size="md" className="mx-auto" />
              <h4 className="font-bold text-slate-700 text-xs">
                ไม่มีรายการรอตรวจสอบในขณะนี้
              </h4>
              <p className="text-[11px] text-slate-400">
                นักเรียนยังไม่ได้ส่งหลักฐานใหม่ หรือตรวจเสร็จสิ้นครบแล้ว
              </p>
            </div>
          ) : (
            filteredSubmissions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenInspect(item)}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:border-emerald-300 transition cursor-pointer flex items-center gap-3"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
                  <img
                    src={item.afterPhoto || item.beforePhoto}
                    alt="หลักฐาน"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl">
                    ก่อน-หลัง
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {item.userName} ({item.className})
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {item.pieces} ชิ้น
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{item.locationName}</span>
                  </p>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>{formatThaiDateTime(item.createdAt)}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                      คลิกเพื่อตรวจ <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Subtab 2: Reward Delivery System */}
      {subTab === 'rewards' && (
        <div className="space-y-3">
          {/* Search by Code */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ค้นหาด้วยรหัส (เช่น TP-4821) หรือชื่อนักเรียน..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {filteredRedemptions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-400 border border-slate-100">
              ไม่พบรายการแลกของรางวัล
            </div>
          ) : (
            filteredRedemptions.map((red) => {
              const isPending = red.status === 'pending';
              return (
                <div
                  key={red.id}
                  className={`bg-white rounded-2xl p-3.5 border shadow-sm transition flex items-center justify-between gap-3 ${
                    isPending ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {red.code}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 leading-snug">
                        {red.rewardName}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600">
                      นักเรียน: <strong>{red.userName}</strong> ({red.className})
                    </p>

                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ขอแลกเมื่อ: {formatThaiDateTime(red.createdAt)}
                    </span>
                  </div>

                  {isPending ? (
                    <button
                      onClick={() => handleDeliverReward(red.id)}
                      disabled={delivering === red.id}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 flex-shrink-0"
                    >
                      {delivering === red.id ? 'กำลังบันทึก...' : '✓ ส่งมอบแล้ว'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0">
                      ส่งมอบแล้ว
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Review & Inspection Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 overflow-y-auto">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl my-auto text-left space-y-3.5">
            <button
              onClick={() => setInspectItem(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold font-mali text-slate-900">
                ตรวจสอบหลักฐานการส่งขยะ
              </h3>
              <p className="text-xs text-slate-500">
                นักเรียน: <strong>{inspectItem.userName}</strong> ({inspectItem.className})
              </p>
            </div>

            {/* Side-by-side Before & After Photos with Zoom effect */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">
                ภาพหลักฐานเปรียบเทียบ (ก่อน vs หลัง):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-500 mb-0.5">1. ก่อนเก็บ:</span>
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={inspectItem.beforePhoto}
                      alt="Before"
                      className="w-full h-full object-cover hover:scale-110 transition duration-300"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 mb-0.5">2. หลังเก็บ:</span>
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={inspectItem.afterPhoto}
                      alt="After"
                      className="w-full h-full object-cover hover:scale-110 transition duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Item details */}
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">จุดที่เก็บ:</span>
                <span className="font-semibold text-slate-800">{inspectItem.locationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภท:</span>
                <span className="font-semibold text-slate-800">{inspectItem.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เวลาส่ง:</span>
                <span className="font-semibold text-slate-800">
                  {formatThaiDateTime(inspectItem.createdAt)}
                </span>
              </div>
            </div>

            {/* Editable Pieces & Points Calculation */}
            <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-950 mb-1">
                ยืนยันจำนวนชิ้นที่ถูกต้อง (ครูสามารถปรับแก้ได้):
              </label>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={approvedPieces}
                  onChange={(e) => setApprovedPieces(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-1.5 text-base font-bold font-mali rounded-xl border border-emerald-300 bg-white text-center"
                />
                <div className="text-right">
                  <span className="text-xs text-slate-600 block">คะแนนที่จะมอบให้:</span>
                  <span className="text-lg font-bold font-mali text-emerald-800">
                    +{calculatePoints(inspectItem, approvedPieces)} คะแนน
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection preset options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                กรณีไม่ผ่าน (เลือกเหตุผลหรือพิมพ์เอง):
              </label>
              <select
                value={selectedPresetReason}
                onChange={(e) => {
                  setSelectedPresetReason(e.target.value);
                  setRejectReason(e.target.value);
                }}
                className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white mb-1.5 focus:outline-none"
              >
                <option value="">-- เลือกเหตุผลมาตรฐาน --</option>
                {presetReasons.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลเพิ่มเติมแก่นักเรียน..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none"
              />
            </div>

            {actionSuccessMsg && (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl text-center">
                {actionSuccessMsg}
              </p>
            )}

            {/* Action Buttons: อนุมัติ vs ไม่ผ่าน */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleReject}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                <span>ไม่ผ่าน</span>
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{processing ? 'กำลังบันทึก...' : 'อนุมัติรายการ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
