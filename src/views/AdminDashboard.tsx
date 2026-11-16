/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MapPin,
  Sliders,
  Gift,
  Users,
  Download,
  Plus,
  Trash2,
  QrCode,
  Megaphone,
  BarChart3,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  TrashLocation,
  Reward,
  UserProfile,
  AppSettings,
} from '../types';
import {
  collection,
  doc,
  getDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  staffSetDoc,
  staffUpdateDoc,
  staffDeleteDoc,
  attachStaffOpToBatch,
} from '../firebase/staffWrite';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  INITIAL_VERIFY_HASHES,
  INITIAL_PROOF_RULE_HASHES,
  StaffVerifyHashes,
  computeVerifyHash,
  computeProofSecret,
  computeProofRuleHash,
  validateSecretStrength,
} from '../utils/security';

interface AdminDashboardProps {
  onBackToHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToHome }) => {
  const { settings, staffSession, updateStaffSessionProof } = useAuth();

  // Statistics State
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPieces: 0,
    pendingSubmissions: 0,
    totalPointsAwarded: 0,
    totalRedemptions: 0,
  });

  // Global status banner for immediate feedback on all admin saves/actions
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setActionBanner({ type, message });
    setTimeout(() => {
      setActionBanner((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Locations state
  const [locations, setLocations] = useState<TrashLocation[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [confirmDeleteLocId, setConfirmDeleteLocId] = useState<string | null>(null);
  const [qrModalLoc, setQrModalLoc] = useState<TrashLocation | null>(null);

  // Settings form state
  const [ruleGeneralMin, setRuleGeneralMin] = useState(settings.generalMin || 5);
  const [ruleGeneralPerPiece, setRuleGeneralPerPiece] = useState(settings.generalPerPiece || 1);
  const [ruleRecycleMin, setRuleRecycleMin] = useState(settings.recycleMin || 15);
  const [ruleRecyclePerPiece, setRuleRecyclePerPiece] = useState(settings.recyclePerPiece || 2);
  const [ruleCertTarget, setRuleCertTarget] = useState(settings.certificateTarget || 100);
  const [ruleDailyLimit, setRuleDailyLimit] = useState(settings.dailySubmitLimit || 3);
  const [ruleMaxPieces, setRuleMaxPieces] = useState(settings.maxPiecesPerSubmit || 50);
  const [announcementText, setAnnouncementText] = useState(settings.announcement || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Sync settings form when Firestore app_config arrives
  useEffect(() => {
    setRuleGeneralMin(settings.generalMin || 5);
    setRuleGeneralPerPiece(settings.generalPerPiece || 1);
    setRuleRecycleMin(settings.recycleMin || 15);
    setRuleRecyclePerPiece(settings.recyclePerPiece || 2);
    setRuleCertTarget(settings.certificateTarget || 100);
    setRuleDailyLimit(settings.dailySubmitLimit || 3);
    setRuleMaxPieces(settings.maxPiecesPerSubmit || 50);
    setAnnouncementText(settings.announcement || '');
  }, [settings]);

  // Announcement saving state
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementSavedSuccess, setAnnouncementSavedSuccess] = useState(false);

  // Rewards catalog state
  const [rewardsList, setRewardsList] = useState<Reward[]>([]);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCategory, setNewRewardCategory] = useState('เครื่องเขียน');
  const [newRewardCost, setNewRewardCost] = useState(20);
  const [newRewardStock, setNewRewardStock] = useState(30);
  const [savingReward, setSavingReward] = useState(false);
  const [confirmDeleteRewardId, setConfirmDeleteRewardId] = useState<string | null>(null);

  // Users state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Security Credential Rotation State (Card 7)
  const [secTargetRole, setSecTargetRole] = useState<'admin' | 'reviewer'>('admin');
  const [secMode, setSecMode] = useState<'credentials' | 'pin'>('credentials');
  const [secUsername, setSecUsername] = useState('');
  const [secPassword, setSecPassword] = useState('');
  const [secPin, setSecPin] = useState('');
  const [showSecSecret, setShowSecSecret] = useState(false);
  const [savingSec, setSavingSec] = useState(false);
  const [secFeedback, setSecFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch Dashboard Statistics and Collections
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserProfile[] = [];
      let totalPiecesCollected = 0;
      let totalPoints = 0;

      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        uList.push({ ...u, uid: d.id });
        totalPiecesCollected += u.totalPieces || 0;
        totalPoints += u.totalEarned || 0;
      });

      setUsersList(uList);
      setStats((prev) => ({
        ...prev,
        totalUsers: uList.length,
        totalPieces: totalPiecesCollected,
        totalPointsAwarded: totalPoints,
      }));
    });

    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snap) => {
      let pendingCount = 0;
      snap.forEach((d) => {
        if (d.data().status === 'pending') pendingCount++;
      });
      setStats((prev) => ({ ...prev, pendingSubmissions: pendingCount }));
    });

    const unsubRedemptions = onSnapshot(collection(db, 'redemptions'), (snap) => {
      setStats((prev) => ({ ...prev, totalRedemptions: snap.size }));
    });

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      const lList: TrashLocation[] = [];
      snap.forEach((d) => lList.push({ id: d.id, ...(d.data() as Omit<TrashLocation, 'id'>) }));
      setLocations(lList);
    });

    const unsubRewards = onSnapshot(collection(db, 'rewards'), (snap) => {
      const rList: Reward[] = [];
      snap.forEach((d) => rList.push({ id: d.id, ...(d.data() as Omit<Reward, 'id'>) }));
      setRewardsList(rList);
    });

    return () => {
      unsubUsers();
      unsubSubmissions();
      unsubRedemptions();
      unsubLocations();
      unsubRewards();
    };
  }, []);

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    setAnnouncementSavedSuccess(false);
    try {
      await staffSetDoc(
        'settings',
        'app_config',
        {
          generalMin: Number(ruleGeneralMin),
          generalPerPiece: Number(ruleGeneralPerPiece),
          recycleMin: Number(ruleRecycleMin),
          recyclePerPiece: Number(ruleRecyclePerPiece),
          certificateTarget: Number(ruleCertTarget),
          dailySubmitLimit: Number(ruleDailyLimit),
          maxPiecesPerSubmit: Number(ruleMaxPieces),
          announcement: announcementText.trim(),
        },
        staffSession,
        { merge: true }
      );
      setAnnouncementSavedSuccess(true);
      showBanner('success', 'บันทึกข้อความประกาศเรียบร้อยแล้ว');
      setTimeout(() => setAnnouncementSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Save announcement error:', err);
      showBanner('error', 'บันทึกประกาศไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ผู้ดูแลระบบ');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Save Scoring Rules
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
      const updated: AppSettings = {
        generalMin: Number(ruleGeneralMin),
        generalPerPiece: Number(ruleGeneralPerPiece),
        recycleMin: Number(ruleRecycleMin),
        recyclePerPiece: Number(ruleRecyclePerPiece),
        certificateTarget: Number(ruleCertTarget),
        dailySubmitLimit: Number(ruleDailyLimit),
        maxPiecesPerSubmit: Number(ruleMaxPieces),
        announcement: announcementText.trim(),
      };

      await staffSetDoc(
        'settings',
        'app_config',
        updated as unknown as Record<string, unknown>,
        staffSession,
        { merge: true }
      );
      setSettingsSavedSuccess(true);
      showBanner('success', 'บันทึกกติกาคะแนนเรียบร้อยแล้ว');
      setTimeout(() => setSettingsSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Save settings error:', err);
      showBanner('error', 'บันทึกกติกาคะแนนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || savingLocation) return;
    setSavingLocation(true);
    try {
      const locId = `loc_${Date.now()}`;
      const qrCodeVal = `TRASH_LOC_${Date.now().toString(36).toUpperCase()}`;

      await staffSetDoc(
        'locations',
        locId,
        {
          id: locId,
          name: newLocName.trim(),
          description: newLocDesc.trim(),
          qrCode: qrCodeVal,
          active: true,
          createdAt: new Date().toISOString(),
        },
        staffSession
      );

      setNewLocName('');
      setNewLocDesc('');
      showBanner('success', 'เพิ่มจุดทิ้งขยะ & QR Code เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Add location error:', err);
      showBanner('error', 'เพิ่มจุดทิ้งขยะไม่สำเร็จ');
    } finally {
      setSavingLocation(false);
    }
  };

  // Delete Location
  const handleDeleteLocation = async (id: string) => {
    try {
      await staffDeleteDoc('locations', id, staffSession);
      setConfirmDeleteLocId(null);
      showBanner('success', 'ลบจุดทิ้งขยะแล้ว');
    } catch (err) {
      console.error('Delete location error:', err);
      showBanner('error', 'ลบจุดทิ้งขยะไม่สำเร็จ');
    }
  };

  // Add Reward
  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardName.trim() || savingReward) return;
    setSavingReward(true);
    try {
      const rewardId = `rew_${Date.now()}`;
      await staffSetDoc(
        'rewards',
        rewardId,
        {
          id: rewardId,
          name: newRewardName.trim(),
          category: newRewardCategory,
          icon: 'gift',
          cost: Number(newRewardCost),
          stock: Number(newRewardStock),
          month: 'ประจำเดือน',
          active: true,
        },
        staffSession
      );
      setNewRewardName('');
      setNewRewardCost(20);
      setNewRewardStock(30);
      showBanner('success', 'เพิ่มของรางวัลเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Add reward error:', err);
      showBanner('error', 'เพิ่มของรางวัลไม่สำเร็จ');
    } finally {
      setSavingReward(false);
    }
  };

  // Update Reward Stock
  const handleUpdateStock = async (id: string, newStock: number) => {
    try {
      await staffUpdateDoc(
        'rewards',
        id,
        { stock: Math.max(0, newStock) },
        staffSession
      );
      showBanner('success', 'อัปเดตสต็อกของรางวัลแล้ว');
    } catch (err) {
      console.error('Update stock error:', err);
      showBanner('error', 'อัปเดตสต็อกไม่สำเร็จ');
    }
  };

  // Delete Reward
  const handleDeleteReward = async (id: string) => {
    try {
      await staffDeleteDoc('rewards', id, staffSession);
      setConfirmDeleteRewardId(null);
      showBanner('success', 'ลบของรางวัลเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Delete reward error:', err);
      showBanner('error', 'ลบของรางวัลไม่สำเร็จ');
    }
  };

  // Update User Role
  const handleUpdateUserRole = async (userId: string, newRole: 'student' | 'reviewer' | 'admin') => {
    try {
      const now = new Date().toISOString();
      await staffUpdateDoc('users', userId, { role: newRole, updatedAt: now }, staffSession);
      showBanner('success', 'อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Update role error:', err);
      showBanner('error', 'อัปเดตสิทธิ์ผู้ใช้ไม่สำเร็จ');
    }
  };

  // Toggle user disabled status
  const handleToggleUserDisabled = async (userId: string, currentDisabled?: boolean) => {
    try {
      await staffUpdateDoc(
        'users',
        userId,
        {
          disabled: !currentDisabled,
          updatedAt: new Date().toISOString(),
        },
        staffSession
      );
      showBanner('success', !currentDisabled ? 'ระงับบัญชีเรียบร้อยแล้ว' : 'ปลดการระงับบัญชีแล้ว');
    } catch (err) {
      console.error('Toggle disabled error:', err);
      showBanner('error', 'เปลี่ยนสถานะบัญชีไม่สำเร็จ');
    }
  };

  // Rotate Admin or Reviewer Password/PIN securely (stores only hashes in Firestore)
  const handleRotateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecFeedback(null);

    if (secMode === 'credentials') {
      if (secUsername.trim().length < 4) {
        setSecFeedback({
          type: 'error',
          message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร',
        });
        return;
      }
      const strengthError = validateSecretStrength('credentials', secPassword);
      if (strengthError) {
        setSecFeedback({ type: 'error', message: strengthError });
        return;
      }
    } else {
      const strengthError = validateSecretStrength('pin', secPin);
      if (strengthError) {
        setSecFeedback({ type: 'error', message: strengthError });
        return;
      }
    }

    setSavingSec(true);
    try {
      const secDocRef = doc(db, 'staff_security', 'hashes');
      const secSnap = await getDoc(secDocRef);
      const existingData = secSnap.exists()
        ? (secSnap.data() as StaffVerifyHashes & { rotatedSlots?: Record<string, boolean> })
        : null;

      const rotatedSlots: Record<string, boolean> = {
        ...(existingData?.rotatedSlots || {}),
      };

      const nextVerifyHashes: StaffVerifyHashes & { rotatedSlots: Record<string, boolean> } = {
        adminCredHash: existingData?.adminCredHash || INITIAL_VERIFY_HASHES.adminCredHash,
        adminPinHash: existingData?.adminPinHash || INITIAL_VERIFY_HASHES.adminPinHash,
        revCredHash: existingData?.revCredHash || INITIAL_VERIFY_HASHES.revCredHash,
        revPinHash: existingData?.revPinHash || INITIAL_VERIFY_HASHES.revPinHash,
        overrideActive: true,
        updatedAt: new Date().toISOString(),
        rotatedSlots,
      };

      const secretVal = secMode === 'credentials' ? secPassword.trim() : secPin.trim();
      const newVerifyHash = await computeVerifyHash(secTargetRole, secMode, secUsername, secretVal);
      const newProofSecret = await computeProofSecret(secTargetRole, secMode, secUsername, secretVal);
      const newProofRuleHash = await computeProofRuleHash(newProofSecret);

      const proofUpdate: Record<string, unknown> = {
        overrideActive: true,
        updatedAt: new Date().toISOString(),
      };

      if (!rotatedSlots.adminCred) {
        proofUpdate.adminCredProofHash = INITIAL_PROOF_RULE_HASHES.adminCredProofHash;
      }
      if (!rotatedSlots.adminPin) {
        proofUpdate.adminPinProofHash = INITIAL_PROOF_RULE_HASHES.adminPinProofHash;
      }
      if (!rotatedSlots.revCred) {
        proofUpdate.revCredProofHash = INITIAL_PROOF_RULE_HASHES.revCredProofHash;
      }
      if (!rotatedSlots.revPin) {
        proofUpdate.revPinProofHash = INITIAL_PROOF_RULE_HASHES.revPinProofHash;
      }

      if (secTargetRole === 'admin' && secMode === 'credentials') {
        nextVerifyHashes.adminCredHash = newVerifyHash;
        proofUpdate.adminCredProofHash = newProofRuleHash;
        rotatedSlots.adminCred = true;
      } else if (secTargetRole === 'admin' && secMode === 'pin') {
        nextVerifyHashes.adminPinHash = newVerifyHash;
        proofUpdate.adminPinProofHash = newProofRuleHash;
        rotatedSlots.adminPin = true;
      } else if (secTargetRole === 'reviewer' && secMode === 'credentials') {
        nextVerifyHashes.revCredHash = newVerifyHash;
        proofUpdate.revCredProofHash = newProofRuleHash;
        rotatedSlots.revCred = true;
      } else {
        nextVerifyHashes.revPinHash = newVerifyHash;
        proofUpdate.revPinProofHash = newProofRuleHash;
        rotatedSlots.revPin = true;
      }

      const batch = writeBatch(db);
      batch.set(secDocRef, nextVerifyHashes, { merge: true });
      batch.set(doc(db, 'private_security', 'staff_proofs'), proofUpdate, { merge: true });
      if (staffSession) {
        attachStaffOpToBatch(batch, 'staff_security', 'hashes', staffSession);
        attachStaffOpToBatch(batch, 'private_security', 'staff_proofs', staffSession);
      }
      await batch.commit();

      if (secTargetRole === 'admin') {
        updateStaffSessionProof(newProofSecret);
      }

      setSecUsername('');
      setSecPassword('');
      setSecPin('');
      setSecFeedback({
        type: 'success',
        message: 'บันทึกรหัสผ่านใหม่แบบเข้ารหัสแฮชเรียบร้อยแล้ว (มีผลทันที)',
      });
      showBanner('success', 'อัปเดตรหัสเข้าสู่ระบบเจ้าหน้าที่เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Rotate credentials error:', err);
      setSecFeedback({
        type: 'error',
        message: 'บันทึกรหัสใหม่ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ผู้ดูแลระบบ',
      });
    } finally {
      setSavingSec(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['UID', 'ชื่อ-นามสกุล', 'ระดับชั้น', 'เลขที่', 'รหัสนักเรียน', 'คะแนนสะสมรวม', 'คะแนนคงเหลือ', 'จำนวนชิ้นที่เก็บ', 'บทบาท'];
    const rows = usersList.map((u) => [
      `"${u.uid}"`,
      `"${u.name}"`,
      `"${u.className}"`,
      `"${u.number}"`,
      `"${u.studentId || ''}"`,
      u.totalEarned,
      u.balance,
      u.totalPieces,
      `"${u.role}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trashpoint-users-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.className.toLowerCase().includes(q) ||
      (u.studentId && u.studentId.includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-16">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-300 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mali leading-tight">
              แผงควบคุมผู้ดูแลระบบ
            </h2>
            <p className="text-xs text-emerald-200">
              จัดการทุกส่วนของโรงเรียนในหน้าเดียว
            </p>
          </div>
        </div>
        <button
          onClick={onBackToHome}
          className="text-xs bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับหน้าหลัก</span>
        </button>
      </div>

      {/* Live Feedback Banner */}
      {actionBanner && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-sm ${
            actionBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {actionBanner.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{actionBanner.message}</span>
        </div>
      )}

      {/* CARD 1: OVERVIEW STATS & CSV EXPORT */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">สรุปภาพรวมโรงเรียน</h3>
              <p className="text-[11px] text-slate-500">สถิติสะสมจากนักเรียนทุกคน</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-semibold block">นักเรียนในระบบ</span>
            <span className="text-2xl font-black font-mali text-emerald-700 block mt-0.5">
              {stats.totalUsers} <span className="text-xs text-slate-500 font-normal">คน</span>
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-semibold block">ขยะที่เก็บรวม</span>
            <span className="text-2xl font-black font-mali text-blue-700 block mt-0.5">
              {stats.totalPieces} <span className="text-xs text-slate-500 font-normal">ชิ้น</span>
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-semibold block">รอตรวจสอบ (Pending)</span>
            <span className="text-2xl font-black font-mali text-amber-600 block mt-0.5">
              {stats.pendingSubmissions} <span className="text-xs text-slate-500 font-normal">รายการ</span>
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-semibold block">คะแนนที่แจกแล้ว</span>
            <span className="text-2xl font-black font-mali text-purple-700 block mt-0.5">
              {stats.totalPointsAwarded} <span className="text-xs text-slate-500 font-normal">แต้ม</span>
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: BROADCAST ANNOUNCEMENT */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">ประกาศข่าวสารกิจกรรมโรงเรียน</h3>
            <p className="text-[11px] text-slate-500">ข้อความจะแสดงบนแถบหัวหน้าแรกของนักเรียนทุกคน</p>
          </div>
        </div>

        <textarea
          rows={2}
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="พิมพ์ข้อความประชาสัมพันธ์กิจกรรม..."
          className="w-full p-3 text-xs bg-slate-50 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="flex items-center justify-between">
          {announcementSavedSuccess ? (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> อัปเดตประกาศเรียบร้อยแล้ว
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleSaveAnnouncement}
            disabled={savingAnnouncement}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            {savingAnnouncement ? 'กำลังบันทึก...' : 'อัปเดตข้อความประกาศ'}
          </button>
        </div>
      </div>

      {/* CARD 3: LOCATIONS & QR CODES */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                จุดทิ้งขยะ & ป้าย QR Code ({locations.length} จุด)
              </h3>
              <p className="text-[11px] text-slate-500">สร้าง QR Code พิมพ์ติดข้างถังขยะในโรงเรียน</p>
            </div>
          </div>
        </div>

        {/* Add Location Subform */}
        <form onSubmit={handleAddLocation} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-xs font-bold text-slate-700 block">เพิ่มจุดทิ้งขยะใหม่:</span>
          <div className="space-y-2">
            <input
              type="text"
              required
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              placeholder="ชื่อสถานที่ (เช่น หน้าอาคาร 4 หรือ สนามบาสเกตบอล)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={newLocDesc}
              onChange={(e) => setNewLocDesc(e.target.value)}
              placeholder="คำอธิบายจุดสังเกต..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingLocation}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{savingLocation ? 'กำลังบันทึก...' : 'บันทึกจุดทิ้งขยะ & สร้าง QR'}</span>
          </button>
        </form>

        {/* Location List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200/80 transition flex items-center justify-between gap-2"
            >
              <div>
                <h4 className="font-bold text-xs text-slate-900">{loc.name}</h4>
                {loc.description && <p className="text-[10px] text-slate-500">{loc.description}</p>}
                <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-1">
                  QR: {loc.qrCode}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setQrModalLoc(loc)}
                  className="py-1.5 px-2.5 bg-white hover:bg-emerald-100 border border-slate-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                  title="ดู/พิมพ์ป้าย QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>ป้าย QR</span>
                </button>
                {confirmDeleteLocId === loc.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white rounded-lg"
                    >
                      ยืนยันลบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteLocId(null)}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLocId(loc.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                    title="ลบจุดนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 4: SCORING RULES CONFIGURATION */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-slate-800">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">กติกาและเกณฑ์การให้คะแนน</h3>
            <p className="text-[11px] text-slate-500">ปรับเปลี่ยนกติกาได้ทันทีโดยไม่ต้องแก้ไขโค้ด</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-2">🗑️ ขยะทั่วไป:</span>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">ขั้นต่ำต่อครั้ง (ชิ้น):</label>
                <input
                  type="number"
                  min="1"
                  value={ruleGeneralMin}
                  onChange={(e) => setRuleGeneralMin(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">คะแนนต่อชิ้น:</label>
                <input
                  type="number"
                  min="1"
                  value={ruleGeneralPerPiece}
                  onChange={(e) => setRuleGeneralPerPiece(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
            <span className="font-bold text-emerald-950 block mb-2">♻️ ขยะรีไซเคิล / ขวดพลาสติก:</span>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">ขั้นต่ำต่อครั้ง (ชิ้น):</label>
                <input
                  type="number"
                  min="1"
                  value={ruleRecycleMin}
                  onChange={(e) => setRuleRecycleMin(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">คะแนนต่อชิ้น:</label>
                <input
                  type="number"
                  min="1"
                  value={ruleRecyclePerPiece}
                  onChange={(e) => setRuleRecyclePerPiece(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">เป้าเกียรติบัตร (แต้ม):</label>
              <input
                type="number"
                value={ruleCertTarget}
                onChange={(e) => setRuleCertTarget(parseInt(e.target.value) || 100)}
                className="w-full p-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-center"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">ส่งได้/วัน (ครั้ง):</label>
              <input
                type="number"
                value={ruleDailyLimit}
                onChange={(e) => setRuleDailyLimit(parseInt(e.target.value) || 3)}
                className="w-full p-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-center"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">สูงสุด/ครั้ง (ชิ้น):</label>
              <input
                type="number"
                value={ruleMaxPieces}
                onChange={(e) => setRuleMaxPieces(parseInt(e.target.value) || 50)}
                className="w-full p-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-center"
              />
            </div>
          </div>
        </div>

        {settingsSavedSuccess && (
          <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl text-center flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> บันทึกกติกาใหม่เรียบร้อยแล้ว
          </p>
        )}

        <button
          type="submit"
          disabled={savingSettings}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
        >
          {savingSettings ? 'กำลังบันทึก...' : 'บันทึกกติกาคะแนน'}
        </button>
      </form>

      {/* CARD 5: REWARD CATALOG & INVENTORY */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                คลังของรางวัลและสต็อก ({rewardsList.length} รายการ)
              </h3>
              <p className="text-[11px] text-slate-500">จัดการรายการของรางวัลและจำนวนคงเหลือ</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddReward} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
          <span className="text-xs font-bold text-slate-700 block">เพิ่มของรางวัลใหม่:</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={newRewardName}
              onChange={(e) => setNewRewardName(e.target.value)}
              placeholder="ชื่อของรางวัล..."
              className="col-span-2 w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            />
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">คะแนนที่ใช้แลก:</label>
              <input
                type="number"
                min="1"
                value={newRewardCost}
                onChange={(e) => setNewRewardCost(parseInt(e.target.value) || 1)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">จำนวนสต็อก:</label>
              <input
                type="number"
                min="0"
                value={newRewardStock}
                onChange={(e) => setNewRewardStock(parseInt(e.target.value) || 0)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingReward}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs disabled:opacity-50"
          >
            {savingReward ? 'กำลังบันทึก...' : 'บันทึกของรางวัล'}
          </button>
        </form>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {rewardsList.map((rew) => (
            <div
              key={rew.id}
              className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2"
            >
              <div>
                <h4 className="font-bold text-xs text-slate-900 leading-snug">{rew.name}</h4>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  ใช้ {rew.cost} แต้ม
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 block">คงเหลือ</span>
                  <input
                    type="number"
                    min="0"
                    value={rew.stock}
                    onChange={(e) => handleUpdateStock(rew.id, parseInt(e.target.value) || 0)}
                    className="w-14 text-center font-bold text-xs border border-slate-300 rounded-lg p-1 bg-white"
                  />
                </div>
                {confirmDeleteRewardId === rew.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteReward(rew.id)}
                      className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white rounded-lg"
                    >
                      ยืนยันลบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRewardId(null)}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRewardId(rew.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="ลบของรางวัล"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 6: USER ACCOUNTS & ROLE PERMISSIONS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                จัดการผู้ใช้ & สิทธิ์ ({usersList.length} บัญชี)
              </h3>
              <p className="text-[11px] text-slate-500">กำหนดบทบาทนักเรียน, ครูผู้ตรวจ, หรือแอดมิน</p>
            </div>
          </div>
        </div>

        <input
          type="text"
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อ, ระดับชั้น, หรือรหัสนักเรียน..."
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">ไม่พบรายชื่อผู้ใช้</p>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.uid}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                  u.disabled ? 'border-red-200 bg-red-50/20 opacity-70' : 'border-slate-200/80 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-xs text-slate-900 leading-snug">{u.name}</h5>
                    {u.disabled && (
                      <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                        ระงับแล้ว
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {u.className} {u.number ? `เลขที่ ${u.number}` : ''} • รวม {u.totalEarned} แต้ม
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={u.role || 'student'}
                    onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as 'student' | 'reviewer' | 'admin')}
                    className="text-xs bg-white border border-slate-300 rounded-xl px-2 py-1 text-slate-700 focus:outline-none"
                  >
                    <option value="student">นักเรียน</option>
                    <option value="reviewer">ครูผู้ตรวจ</option>
                    <option value="admin">แอดมิน</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleToggleUserDisabled(u.uid, u.disabled)}
                    className={`p-1.5 rounded-lg text-[10px] font-bold ${
                      u.disabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                    title={u.disabled ? 'ปลดการระงับ' : 'ระงับบัญชี'}
                  >
                    {u.disabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CARD 7: STAFF CREDENTIAL & PIN SECURITY ROTATION */}
      <form
        onSubmit={handleRotateCredentials}
        className="bg-white rounded-3xl p-5 border border-purple-200/90 shadow-sm space-y-3.5"
      >
        <div className="flex items-center gap-2 text-slate-800">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">ความปลอดภัย & เปลี่ยนรหัสผ่าน / PIN</h3>
            <p className="text-[11px] text-slate-500">
              บันทึกเป็นแฮช SHA-256 เสมอ (ไม่เก็บรหัสจริงในระบบ)
            </p>
          </div>
        </div>

        {/* Select Staff Role to Update */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setSecTargetRole('admin');
              setSecFeedback(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition ${
              secTargetRole === 'admin'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ผู้ดูแลระบบ (Admin)
          </button>
          <button
            type="button"
            onClick={() => {
              setSecTargetRole('reviewer');
              setSecFeedback(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition ${
              secTargetRole === 'reviewer'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ครูผู้ตรวจ (Reviewer)
          </button>
        </div>

        {/* Select Credential Type */}
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setSecMode('credentials');
              setSecFeedback(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl border font-bold transition ${
              secMode === 'credentials'
                ? 'bg-purple-50 border-purple-400 text-purple-900'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            Username & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setSecMode('pin');
              setSecFeedback(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl border font-bold transition ${
              secMode === 'pin'
                ? 'bg-purple-50 border-purple-400 text-purple-900'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            รหัส PIN (6–12 หลัก)
          </button>
        </div>

        {secMode === 'credentials' ? (
          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Username ใหม่ (อย่างน้อย 4 ตัวอักษร):
              </label>
              <input
                type="text"
                required
                value={secUsername}
                onChange={(e) => setSecUsername(e.target.value)}
                placeholder="ตั้งชื่อผู้ใช้ใหม่..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                รหัสผ่านใหม่ (8+ ตัวอักษร ผสมตัวอักษรและตัวเลข):
              </label>
              <div className="relative">
                <input
                  type={showSecSecret ? 'text' : 'password'}
                  required
                  value={secPassword}
                  onChange={(e) => setSecPassword(e.target.value)}
                  placeholder="ตั้งรหัสผ่านที่คาดเดายาก..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecSecret((v) => !v)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showSecSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs">
            <label className="block font-semibold text-slate-700 mb-1">
              รหัส PIN ใหม่ (ตัวเลข 6–12 หลัก ห้ามเรียงหรือซ้ำ):
            </label>
            <div className="relative">
              <input
                type={showSecSecret ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                required
                value={secPin}
                onChange={(e) => setSecPin(e.target.value.replace(/\D/g, ''))}
                placeholder="ตั้งรหัส PIN ตัวเลข 6–12 หลัก..."
                className="w-full pl-3 pr-9 py-2.5 font-mono tracking-widest rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowSecSecret((v) => !v)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showSecSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {secFeedback && (
          <p
            className={`text-xs font-bold p-2.5 rounded-xl border text-center ${
              secFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {secFeedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={savingSec}
          className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
        >
          {savingSec
            ? 'กำลังเข้ารหัสและบันทึก...'
            : `บันทึกรหัส ${secTargetRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูผู้ตรวจ'} ใหม่`}
        </button>
      </form>

      {/* QR Code Location Poster Modal */}
      {qrModalLoc && (
        <QRCodeModal
          isOpen={!!qrModalLoc}
          onClose={() => setQrModalLoc(null)}
          title={`จุดทิ้งขยะ: ${qrModalLoc.name}`}
          subtitle={qrModalLoc.description || 'สแกน QR Code เพื่อส่งหลักฐานการเก็บขยะ'}
          codeValue={qrModalLoc.qrCode}
          isLocationPoster={true}
        />
      )}
    </div>
  );
};
