/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  MapPin,
  Calendar,
  X,
  Filter,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Submission, SubmissionStatus } from '../types';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatThaiDateTime, formatThaiDate } from '../utils/dateFormatter';
import { Mascot } from '../components/Mascot';

interface HistoryScreenProps {
  onGoToSubmit: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onGoToSubmit }) => {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
  const [datePeriodFilter, setDatePeriodFilter] = useState<'all' | 'today' | 'month'>('all');

  // Selected item modal
  const [selectedItem, setSelectedItem] = useState<Submission | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to user's submissions
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Submission[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Submission, 'id'>) });
        });
        // Sort newest first
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.error('Submissions history listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  // Filter submissions
  const filteredSubmissions = submissions.filter((item) => {
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    // Date filter
    if (datePeriodFilter !== 'all') {
      const itemDate = new Date(item.createdAt);
      const now = new Date();
      if (datePeriodFilter === 'today') {
        const isSameDay =
          itemDate.getDate() === now.getDate() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
        if (!isSameDay) return false;
      } else if (datePeriodFilter === 'month') {
        const isSameMonth =
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
        if (!isSameMonth) return false;
      }
    }
    return true;
  });

  const getTypeName = (type: string) => {
    switch (type) {
      case 'general':
        return 'ขยะทั่วไป';
      case 'recycle':
        return 'ขวดพลาสติก/รีไซเคิล';
      case 'paper':
        return 'กระดาษ/กล่อง';
      default:
        return 'ขยะอื่นๆ';
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-mali text-slate-900">
          ประวัติการเก็บขยะของฉัน
        </h2>
        <p className="text-xs text-slate-500">
          ติดตามสถานะและตรวจสอบผลคะแนนที่ได้รับ
        </p>
      </div>

      {/* Date Filters: ทั้งหมด | วันนี้ | เดือนนี้ */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setDatePeriodFilter('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
            datePeriodFilter === 'all'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => setDatePeriodFilter('today')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
            datePeriodFilter === 'today'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          วันนี้
        </button>
        <button
          onClick={() => setDatePeriodFilter('month')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
            datePeriodFilter === 'month'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          เดือนนี้
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-full border transition flex-shrink-0 ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white border-slate-800 font-bold'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          ทุกสถานะ ({submissions.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1 rounded-full border transition flex-shrink-0 ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white border-amber-500 font-bold'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          ⏳ รอตรวจ ({submissions.filter((s) => s.status === 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-3 py-1 rounded-full border transition flex-shrink-0 ${
            statusFilter === 'approved'
              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          ✓ อนุมัติ ({submissions.filter((s) => s.status === 'approved').length})
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-3 py-1 rounded-full border transition flex-shrink-0 ${
            statusFilter === 'rejected'
              ? 'bg-red-500 text-white border-red-500 font-bold'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          ✕ ไม่ผ่าน ({submissions.filter((s) => s.status === 'rejected').length})
        </button>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          กำลังโหลดประวัติ...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
          <Mascot mood="empty" size="md" className="mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">ยังไม่พบรายการเก็บขยะ</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            เริ่มต้นเป็นส่วนหนึ่งในการรักษาความสะอาดของโรงเรียน พร้อมสะสมแต้มแลกรางวัลกันเลย!
          </p>
          <button
            onClick={onGoToSubmit}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition"
          >
            ไปหน้าส่งหลักฐานขยะ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((item) => {
            const isApproved = item.status === 'approved';
            const isPending = item.status === 'pending';
            const isRejected = item.status === 'rejected';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 hover:border-emerald-200 transition cursor-pointer active:scale-99 flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
                  <img
                    src={item.afterPhoto || item.beforePhoto}
                    alt="หลักฐาน"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl">
                    2 รูป
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs text-slate-800 truncate">
                      {getTypeName(item.type)} ({item.approvedPieces || item.pieces} ชิ้น)
                    </span>
                    {/* Status Badge */}
                    {isApproved && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        อนุมัติ
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" />
                        รอตรวจ
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-red-600" />
                        ไม่ผ่าน
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{item.locationName}</span>
                  </p>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>{formatThaiDateTime(item.createdAt)}</span>

                    {/* Points Badge */}
                    {isApproved && (
                      <span className="font-bold text-xs text-amber-600 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        +{item.points} คะแนน
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 overflow-y-auto">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl my-auto text-left space-y-3.5">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold font-mali text-slate-900">
                  รายละเอียดการส่งขยะ
                </span>
                {selectedItem.status === 'approved' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    อนุมัติแล้ว (+{selectedItem.points} คะแนน)
                  </span>
                )}
                {selectedItem.status === 'pending' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    กำลังรอตรวจสอบ
                  </span>
                )}
                {selectedItem.status === 'rejected' && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    ไม่ผ่านการตรวจสอบ
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                ส่งเมื่อ {formatThaiDateTime(selectedItem.createdAt)}
              </p>
            </div>

            {/* Side-by-side Before & After Photos */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1.5">
                เปรียบเทียบรูปภาพ ก่อน → หลัง:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-500 mb-0.5">ก่อนเก็บ:</span>
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={selectedItem.beforePhoto}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 mb-0.5">หลังเก็บ:</span>
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={selectedItem.afterPhoto}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภท:</span>
                <span className="font-semibold text-slate-800">
                  {getTypeName(selectedItem.type)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนที่ส่ง:</span>
                <span className="font-semibold text-slate-800">
                  {selectedItem.pieces} ชิ้น
                </span>
              </div>
              {selectedItem.approvedPieces !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนที่อนุมัติ:</span>
                  <span className="font-semibold text-emerald-700">
                    {selectedItem.approvedPieces} ชิ้น
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">สถานที่:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {selectedItem.locationName}
                </span>
              </div>
              {selectedItem.reviewedBy && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">ผู้ตรวจสอบ:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedItem.reviewerName || 'ครูผู้ตรวจ'}
                  </span>
                </div>
              )}
            </div>

            {/* Rejection Reason if any */}
            {selectedItem.rejectReason && (
              <div className="bg-red-50 p-3 rounded-2xl border border-red-200 text-xs">
                <span className="font-bold text-red-800 block mb-0.5">เหตุผลที่ไม่ผ่าน:</span>
                <p className="text-red-700 leading-relaxed">
                  {selectedItem.rejectReason}
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
