/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Award,
  Star,
  Trash2,
  Send,
  LogOut,
  Edit2,
  Check,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CertificateModal } from '../components/CertificateModal';
import { UserRole } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ProfileScreenProps {
  onNavigateToRole?: (tab: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigateToRole }) => {
  const { profile, role, updateProfileData, switchRole, logout } = useAuth();
  const [showCertificate, setShowCertificate] = useState(false);
  const [submissionCount, setSubmissionCount] = useState<number>(0);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [className, setClassName] = useState(profile?.className || '');
  const [number, setNumber] = useState(profile?.number || '');
  const [studentId, setStudentId] = useState(profile?.studentId || '');
  const [avatar, setAvatar] = useState(profile?.avatar || 'avatar_1');
  const [saving, setSaving] = useState(false);

  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setClassName(profile.className);
      setNumber(profile.number);
      setStudentId(profile.studentId || '');
      setAvatar(profile.avatar || 'avatar_1');
    }
  }, [profile]);

  // Fetch count of submissions for stats
  useEffect(() => {
    async function loadStats() {
      if (!profile?.uid) return;
      try {
        const q = query(
          collection(db, 'submissions'),
          where('userId', '==', profile.uid)
        );
        const snap = await getDocs(q);
        setSubmissionCount(snap.size);
      } catch (e) {
        console.warn('Submission count warning:', e);
      }
    }
    loadStats();
  }, [profile?.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfileData({
        name: name.trim(),
        className: className.trim(),
        number: number.trim(),
        studentId: studentId.trim(),
        avatar,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  const avatars = [
    { id: 'avatar_1', emoji: '🧑‍🎓', label: 'นักเรียน' },
    { id: 'avatar_2', emoji: '👧', label: 'สดใส' },
    { id: 'avatar_3', emoji: '🌱', label: 'ต้นกล้า' },
    { id: 'avatar_4', emoji: '🦊', label: 'จิ้งจอก' },
    { id: 'avatar_5', emoji: '🐼', label: 'แพนด้า' },
  ];

  const getAvatarEmoji = (av?: string) => {
    const found = avatars.find((a) => a.id === av);
    return found ? found.emoji : '🧑‍🎓';
  };

  const hasCertificate = (profile?.totalEarned || 0) >= 100;

  return (
    <div className="space-y-4 pb-12">
      {/* Profile Header Box */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center relative">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition text-xs font-semibold flex items-center gap-1"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'ยกเลิก' : 'แก้ไข'}</span>
        </button>

        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-100 to-green-100 border-4 border-emerald-300 flex items-center justify-center text-4xl mx-auto shadow-inner mb-3">
          {getAvatarEmoji(profile?.avatar)}
        </div>

        <h2 className="text-lg font-bold font-mali text-slate-900 leading-tight">
          {profile?.name || 'นักเรียน'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {profile?.className || 'ม.6/2'} {profile?.number ? `• เลขที่ ${profile.number}` : ''}
          {profile?.studentId ? ` • รหัส ${profile.studentId}` : ''}
        </p>

        {/* Current Role Badge */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
            {role === 'admin'
              ? '🛡️ ผู้ดูแลระบบ (Admin)'
              : role === 'reviewer'
              ? '🔍 ผู้ตรวจสอบ (Reviewer)'
              : '🧑‍🎓 นักเรียน (Student)'}
          </span>
        </div>
      </div>

      {/* Edit Form Drawer */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl p-5 border border-emerald-300 shadow-sm space-y-3 animate-in fade-in"
        >
          <h4 className="font-bold text-xs text-slate-800">เลือกอวาตาร์ประจำตัว:</h4>
          <div className="flex justify-between gap-1 mb-3">
            {avatars.map((av) => (
              <button
                type="button"
                key={av.id}
                onClick={() => setAvatar(av.id)}
                className={`flex-1 py-2 rounded-xl text-xl transition flex flex-col items-center border ${
                  avatar === av.id
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{av.emoji}</span>
                <span className="text-[9px] text-slate-600 mt-0.5">{av.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระดับชั้น:
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="เช่น ม.6/2"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลขที่:
              </label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="เช่น 15"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสนักเรียน:
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="เช่น 54821"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </form>
      )}

      {/* Statistics 4-Card Grid */}
      <div>
        <h3 className="font-bold text-xs text-slate-800 mb-2 px-1">
          สถิติการรักษ์สิ่งแวดล้อมของคุณ
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold block">
              จำนวนชิ้นที่เก็บรวม
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mali text-emerald-700">
                {profile?.totalPieces || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">ชิ้น</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold block">
              คะแนนสะสมตลอดกาล
            </span>
            <div className="flex items-baseline gap-1 mt-1 text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-2xl font-black font-mali">
                {profile?.totalEarned || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">แต้ม</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold block">
              คะแนนคงเหลือปัจจุบัน
            </span>
            <div className="flex items-baseline gap-1 mt-1 text-purple-600">
              <span className="text-2xl font-black font-mali">
                {profile?.balance || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">แต้ม</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-semibold block">
              จำนวนครั้งที่ส่งขยะ
            </span>
            <div className="flex items-baseline gap-1 mt-1 text-blue-600">
              <span className="text-2xl font-black font-mali">
                {submissionCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">ครั้ง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Box */}
      <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-3xl p-4 border border-amber-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-sm">
            <Award className="w-7 h-7 text-amber-950" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">
              เกียรติบัตรนักอนุรักษ์ดีเด่น
            </h4>
            <p className="text-[11px] text-slate-500">
              {hasCertificate
                ? 'คุณได้รับเกียรติบัตรแล้ว (ครบ 100 แต้ม)'
                : `สะสมอีก ${100 - (profile?.totalEarned || 0)} แต้มเพื่อรับเกียรติบัตร`}
            </p>
          </div>
        </div>

        {hasCertificate && (
          <button
            onClick={() => setShowCertificate(true)}
            className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-xs transition"
          >
            ดูเกียรติบัตร
          </button>
        )}
      </div>

      {/* Staff Management Console (Visible ONLY to Reviewer & Admin) */}
      {(role === 'reviewer' || role === 'admin') && (
        <div className="bg-emerald-50 rounded-3xl p-4 border border-emerald-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>สิทธิ์การใช้งานของบุคลากร:</span>
            </h4>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
              {role === 'admin' ? '🛡️ ผู้ดูแลระบบโรงเรียน' : '🔍 ครูผู้ตรวจหลักฐาน'}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigateToRole && onNavigateToRole('reviewer')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition text-center"
            >
              🔍 หน้าตรวจสอบขยะ
            </button>
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigateToRole && onNavigateToRole('admin')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition text-center"
              >
                🛡️ แผงควบคุมโรงเรียน
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logout Button */}
      <button
        onClick={logout}
        className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-semibold text-xs transition flex items-center justify-center gap-2 border border-slate-200"
      >
        <LogOut className="w-4 h-4" />
        <span>ออกจากระบบ</span>
      </button>

      {/* Certificate Viewer Modal */}
      {profile && (
        <CertificateModal
          profile={profile}
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};
