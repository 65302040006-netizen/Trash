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
  Target,
  Users,
  Download,
  Plus,
  Trash2,
  Edit2,
  QrCode,
  Save,
  Check,
  Megaphone,
  BarChart3,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  TrashLocation,
  Reward,
  Mission,
  UserProfile,
  AppSettings,
  Submission,
  Redemption,
} from '../types';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { QRCodeModal } from '../components/QRCodeModal';
import { formatThaiDateTime } from '../utils/dateFormatter';

interface AdminDashboardProps {
  onBackToHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToHome }) => {
  const { settings, profile } = useAuth();
  const [activeSection, setActiveSection] = useState<
    'stats' | 'locations' | 'rules' | 'rewards' | 'missions' | 'users'
  >('stats');

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPieces: 0,
    pendingSubmissions: 0,
    totalPointsAwarded: 0,
    totalRedemptions: 0,
  });

  // Locations state
  const [locations, setLocations] = useState<TrashLocation[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
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

  // Rewards catalog state
  const [rewardsList, setRewardsList] = useState<Reward[]>([]);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCategory, setNewRewardCategory] = useState('เครื่องเขียน');
  const [newRewardCost, setNewRewardCost] = useState(20);
  const [newRewardStock, setNewRewardStock] = useState(30);

  // Missions state
  const [missionsList, setMissionsList] = useState<Mission[]>([]);

  // Users state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Fetch Dashboard Statistics and Data
  useEffect(() => {
    // 1. Fetch Users
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

    // 2. Fetch Submissions for pending count
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snap) => {
      let pendingCount = 0;
      snap.forEach((d) => {
        if (d.data().status === 'pending') pendingCount++;
      });
      setStats((prev) => ({ ...prev, pendingSubmissions: pendingCount }));
    });

    // 3. Fetch Redemptions count
    const unsubRedemptions = onSnapshot(collection(db, 'redemptions'), (snap) => {
      setStats((prev) => ({ ...prev, totalRedemptions: snap.size }));
    });

    // 4. Fetch Locations
    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      const lList: TrashLocation[] = [];
      snap.forEach((d) => lList.push({ id: d.id, ...(d.data() as Omit<TrashLocation, 'id'>) }));
      setLocations(lList);
    });

    // 5. Fetch Rewards
    const unsubRewards = onSnapshot(collection(db, 'rewards'), (snap) => {
      const rList: Reward[] = [];
      snap.forEach((d) => rList.push({ id: d.id, ...(d.data() as Omit<Reward, 'id'>) }));
      setRewardsList(rList);
    });

    // 6. Fetch Missions
    const unsubMissions = onSnapshot(collection(db, 'missions'), (snap) => {
      const mList: Mission[] = [];
      snap.forEach((d) => mList.push({ id: d.id, ...(d.data() as Omit<Mission, 'id'>) }));
      setMissionsList(mList);
    });

    return () => {
      unsubUsers();
      unsubSubmissions();
      unsubRedemptions();
      unsubLocations();
      unsubRewards();
      unsubMissions();
    };
  }, []);

  // Save Settings
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

      await setDoc(doc(db, 'settings', 'app_config'), updated);
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    try {
      const locId = `loc_${Date.now()}`;
      const qrCodeVal = `TRASH_LOC_${Date.now().toString(36).toUpperCase()}`;

      await setDoc(doc(db, 'locations', locId), {
        id: locId,
        name: newLocName.trim(),
        description: newLocDesc.trim(),
        qrCode: qrCodeVal,
        active: true,
        createdAt: new Date().toISOString(),
      });

      setNewLocName('');
      setNewLocDesc('');
    } catch (err) {
      console.error('Add location error:', err);
    }
  };

  // Delete Location
  const handleDeleteLocation = async (id: string) => {
    if (!confirm('ต้องการลบจุดทิ้งขยะนี้หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'locations', id));
    } catch (err) {
      console.error('Delete location error:', err);
    }
  };

  // Add Reward
  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardName.trim()) return;
    try {
      const rewardId = `rew_${Date.now()}`;
      await setDoc(doc(db, 'rewards', rewardId), {
        id: rewardId,
        name: newRewardName.trim(),
        category: newRewardCategory,
        icon: 'gift',
        cost: Number(newRewardCost),
        stock: Number(newRewardStock),
        month: 'กุมภาพันธ์',
        active: true,
      });
      setNewRewardName('');
      setNewRewardCost(20);
      setNewRewardStock(30);
    } catch (err) {
      console.error('Add reward error:', err);
    }
  };

  // Update Reward Stock
  const handleUpdateStock = async (id: string, newStock: number) => {
    try {
      await updateDoc(doc(db, 'rewards', id), {
        stock: Math.max(0, newStock),
      });
    } catch (err) {
      console.error('Update stock error:', err);
    }
  };

  // Delete Reward
  const handleDeleteReward = async (id: string) => {
    if (!confirm('ต้องการลบของรางวัลนี้หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'rewards', id));
    } catch (err) {
      console.error('Delete reward error:', err);
    }
  };

  // Update User Role
  const handleUpdateUserRole = async (userId: string, newRole: 'student' | 'reviewer' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      // Update admins or reviewers collection for Firestore security rules lookup
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', userId), { active: true });
      } else if (newRole === 'reviewer') {
        await setDoc(doc(db, 'reviewers', userId), { active: true });
      }
    } catch (err) {
      console.error('Update role error:', err);
    }
  };

  // Toggle user disabled status
  const handleToggleUserDisabled = async (userId: string, currentDisabled?: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { disabled: !currentDisabled });
    } catch (err) {
      console.error('Toggle disabled error:', err);
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

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-3xl p-4.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mali">
                แผงควบคุมผู้ดูแลระบบ
              </h2>
              <p className="text-[11px] text-purple-200">
                School Administrator Console
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

        {/* Section Navigation Pills */}
        <div className="flex gap-1.5 overflow-x-auto pt-3 text-xs">
          {[
            { id: 'stats', label: 'ภาพรวม', icon: BarChart3 },
            { id: 'locations', label: 'จุดขยะ & QR', icon: MapPin },
            { id: 'rules', label: 'กติกาคะแนน', icon: Sliders },
            { id: 'rewards', label: 'ของรางวัล', icon: Gift },
            { id: 'users', label: 'จัดการผู้ใช้', icon: Users },
          ].map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`py-1.5 px-3 rounded-xl font-semibold flex items-center gap-1 flex-shrink-0 transition ${
                  isSelected
                    ? 'bg-amber-400 text-slate-900 font-bold shadow-xs'
                    : 'bg-white/15 text-purple-100 hover:bg-white/25'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: STATS & OVERVIEW */}
      {activeSection === 'stats' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">
                นักเรียนในระบบ
              </span>
              <span className="text-2xl font-black font-mali text-emerald-700 block mt-1">
                {stats.totalUsers} <span className="text-xs text-slate-500 font-normal">คน</span>
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">
                ขยะที่ถูกเก็บรวม
              </span>
              <span className="text-2xl font-black font-mali text-blue-700 block mt-1">
                {stats.totalPieces} <span className="text-xs text-slate-500 font-normal">ชิ้น</span>
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">
                รายการรอตรวจ (Pending)
              </span>
              <span className="text-2xl font-black font-mali text-amber-600 block mt-1">
                {stats.pendingSubmissions} <span className="text-xs text-slate-500 font-normal">รายการ</span>
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">
                คะแนนแจกแล้วทั้งหมด
              </span>
              <span className="text-2xl font-black font-mali text-purple-700 block mt-1">
                {stats.totalPointsAwarded} <span className="text-xs text-slate-500 font-normal">แต้ม</span>
              </span>
            </div>
          </div>

          {/* Quick CSV Export Banner */}
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs text-emerald-950">ส่งออกรายงานสรุป (CSV)</h4>
              <p className="text-[10px] text-emerald-800">รายชื่อนักเรียน คะแนนสะสม และสถิติรวม</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: LOCATIONS & QR CODE POSTER */}
      {activeSection === 'locations' && (
        <div className="space-y-4">
          {/* Add Location Form */}
          <form onSubmit={handleAddLocation} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>เพิ่มจุดทิ้งขยะ / สร้าง QR Code ประจำจุด:</span>
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                required
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="ชื่อจุด เช่น หน้าอาคาร 4 หรือ สนามบาสเกตบอล"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={newLocDesc}
                onChange={(e) => setNewLocDesc(e.target.value)}
                placeholder="รายละเอียดตำแหน่ง (ระบุชัดเจนให้นักเรียนหาเจอ)..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกและสร้างป้าย QR Code</span>
            </button>
          </form>

          {/* Locations List */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-700 px-1">
              จุดทิ้งขยะในโรงเรียนทั้งหมด ({locations.length} จุด):
            </h4>
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex items-center justify-between gap-3"
              >
                <div>
                  <h5 className="font-bold text-xs text-slate-900 leading-snug">{loc.name}</h5>
                  {loc.description && <p className="text-[10px] text-slate-500">{loc.description}</p>}
                  <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1">
                    QR: {loc.qrCode}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setQrModalLoc(loc)}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                    title="ดู / พิมพ์ป้าย QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                    title="ลบจุดนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: SCORING RULES SETTINGS */}
      {activeSection === 'rules' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-800">
              ตั้งค่ากติกาและเกณฑ์คะแนน (ปรับใช้ทันทีโดยไม่ต้องแก้โค้ด):
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            {/* General Trash */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2">🗑️ ขยะทั่วไป:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">ส่งขั้นต่ำ (ชิ้น):</label>
                  <input
                    type="number"
                    min="1"
                    value={ruleGeneralMin}
                    onChange={(e) => setRuleGeneralMin(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">คะแนนต่อชิ้น:</label>
                  <input
                    type="number"
                    min="1"
                    value={ruleGeneralPerPiece}
                    onChange={(e) => setRuleGeneralPerPiece(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Recycle Trash */}
            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
              <span className="font-bold text-emerald-950 block mb-2">♻️ ขยะรีไซเคิล/ขวดพลาสติก/กระดาษ:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">ส่งขั้นต่ำ (ชิ้น):</label>
                  <input
                    type="number"
                    min="1"
                    value={ruleRecycleMin}
                    onChange={(e) => setRuleRecycleMin(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">คะแนนต่อชิ้น:</label>
                  <input
                    type="number"
                    min="1"
                    value={ruleRecyclePerPiece}
                    onChange={(e) => setRuleRecyclePerPiece(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Anti-cheat & Certificate limits */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">เกียรติบัตร (แต้ม):</label>
                <input
                  type="number"
                  value={ruleCertTarget}
                  onChange={(e) => setRuleCertTarget(parseInt(e.target.value) || 100)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">ส่งได้/วัน (ครั้ง):</label>
                <input
                  type="number"
                  value={ruleDailyLimit}
                  onChange={(e) => setRuleDailyLimit(parseInt(e.target.value) || 3)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">สูงสุด/ครั้ง (ชิ้น):</label>
                <input
                  type="number"
                  value={ruleMaxPieces}
                  onChange={(e) => setRuleMaxPieces(parseInt(e.target.value) || 50)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-300"
                />
              </div>
            </div>

            {/* Announcement Banner */}
            <div>
              <label className="text-[11px] text-slate-700 font-bold block mb-1 flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>ข้อความประกาศถึงนักเรียนทุกคน (Broadcast):</span>
              </label>
              <textarea
                rows={2}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="พิมพ์ข้อความประชาสัมพันธ์กิจกรรมโรงเรียน..."
                className="w-full p-2.5 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {settingsSavedSuccess && (
            <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl text-center">
              ✓ บันทึกกติกาใหม่เรียบร้อยแล้ว
            </p>
          )}

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {savingSettings ? 'กำลังบันทึก...' : 'บันทึกกติกาการให้คะแนน'}
          </button>
        </form>
      )}

      {/* SECTION 4: REWARDS & INVENTORY */}
      {activeSection === 'rewards' && (
        <div className="space-y-4">
          {/* Add Reward Form */}
          <form onSubmit={handleAddReward} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>เพิ่มของรางวัลใหม่:</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
                placeholder="ชื่อของรางวัล..."
                className="col-span-2 w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">คะแนนที่ใช้แลก:</label>
                <input
                  type="number"
                  min="1"
                  value={newRewardCost}
                  onChange={(e) => setNewRewardCost(parseInt(e.target.value) || 1)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">จำนวนสต็อกคงเหลือ:</label>
                <input
                  type="number"
                  min="0"
                  value={newRewardStock}
                  onChange={(e) => setNewRewardStock(parseInt(e.target.value) || 0)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
            >
              บันทึกของรางวัล
            </button>
          </form>

          {/* Reward Catalog List with in-place stock modifier */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-700 px-1">
              รายการของรางวัลและสต็อก ({rewardsList.length} รายการ):
            </h4>
            {rewardsList.map((rew) => (
              <div
                key={rew.id}
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex items-center justify-between gap-2"
              >
                <div>
                  <h5 className="font-bold text-xs text-slate-900 leading-snug">{rew.name}</h5>
                  <span className="text-[10px] text-amber-700 font-semibold">
                    ใช้ {rew.cost} แต้ม
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">คงเหลือ</span>
                    <input
                      type="number"
                      min="0"
                      value={rew.stock}
                      onChange={(e) => handleUpdateStock(rew.id, parseInt(e.target.value) || 0)}
                      className="w-14 text-center font-bold text-xs border border-slate-300 rounded-lg p-1"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteReward(rew.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: USER MANAGEMENT */}
      {activeSection === 'users' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="font-bold text-xs text-slate-700">
              รายชื่อผู้ใช้ทั้งหมด ({usersList.length} บัญชี)
            </h4>
            <button
              onClick={handleExportCSV}
              className="text-[11px] text-emerald-700 font-bold hover:underline"
            >
              ดาวน์โหลด CSV
            </button>
          </div>

          <div className="space-y-2">
            {usersList.map((u) => (
              <div
                key={u.uid}
                className={`bg-white rounded-2xl p-3 border shadow-2xs flex items-center justify-between gap-2 ${
                  u.disabled ? 'border-red-200 bg-red-50/20 opacity-70' : 'border-slate-100'
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
                    onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as any)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2 py-1 text-slate-700 focus:outline-none"
                  >
                    <option value="student">นักเรียน</option>
                    <option value="reviewer">ครูผู้ตรวจ</option>
                    <option value="admin">แอดมิน</option>
                  </select>

                  <button
                    onClick={() => handleToggleUserDisabled(u.uid, u.disabled)}
                    className={`p-1.5 rounded-lg text-[10px] font-bold ${
                      u.disabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {u.disabled ? 'ปลด' : 'ระงับ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
