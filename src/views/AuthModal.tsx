/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mascot } from '../components/Mascot';
import { useAuth } from '../context/AuthContext';
import { Recycle, ShieldCheck, UserCheck, X } from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const {
    loginWithGoogle,
    loginAsAdminDirect,
    loginAsStudentDirect,
    profile,
    updateProfileData,
    user,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptedConsent, setAcceptedConsent] = useState(true);

  // Setup profile form state
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [className, setClassName] = useState(profile?.className || 'ม.6/2');
  const [number, setNumber] = useState(profile?.number || '15');
  const [studentId, setStudentId] = useState(profile?.studentId || '54321');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar || 'avatar_1');

  // If user is logged in but hasn't finalized their student profile
  const isSettingUpProfile = user && (!profile?.className || profile?.className === 'ม.1/1' && !profile?.studentId);

  const handleGoogleSignIn = async () => {
    if (!acceptedConsent) {
      setErrorMsg('กรุณากดยินยอมข้อตกลงความเป็นส่วนตัวก่อนเข้าสู่ระบบ');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.warn('Google sign-in message:', err);
      setErrorMsg('ไม่สามารถเปิดหน้าต่าง Google Login ได้ กรุณาตรวจสอบการอนุญาต Pop-up ในเบราว์เซอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    setLoading(true);
    try {
      await updateProfileData({
        name: name.trim(),
        className: className.trim(),
        number: number.trim(),
        studentId: studentId.trim(),
        avatar: selectedAvatar,
      });
    } catch (err) {
      setErrorMsg('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  // Avatar Options
  const avatars = [
    { id: 'avatar_1', emoji: '🧑‍🎓', label: 'นักเรียน' },
    { id: 'avatar_2', emoji: '👧', label: 'สดใส' },
    { id: 'avatar_3', emoji: '🌱', label: 'ต้นกล้า' },
    { id: 'avatar_4', emoji: '🦊', label: 'จิ้งจอก' },
    { id: 'avatar_5', emoji: '🐼', label: 'แพนด้า' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center border-2 border-emerald-100 my-auto">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Mascot Header */}
        <div className="flex justify-center -mt-12 mb-2">
          <div className="w-24 h-24 rounded-full bg-emerald-100/90 border-4 border-white flex items-center justify-center shadow-lg">
            <Mascot mood={isSettingUpProfile ? 'happy' : 'excited'} size="md" />
          </div>
        </div>

        {isSettingUpProfile ? (
          /* Profile Setup Screen */
          <form onSubmit={handleSaveProfile} className="text-left mt-2">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold font-mali text-emerald-800">
                ยินดีต้อนรับสู่ Trash Point!
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กรอกข้อมูลนักเรียนของคุณเพื่อเริ่มสะสมแต้ม
              </p>
            </div>

            {/* Avatar Selector */}
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              เลือกรูปประจำตัว (อวาตาร์):
            </label>
            <div className="flex justify-between gap-1 mb-4">
              {avatars.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`flex-1 py-2 rounded-xl text-xl transition flex flex-col items-center border ${
                    selectedAvatar === av.id
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{av.emoji}</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">{av.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น เด็กชายสมชาย รักสะอาด"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับชั้น (เช่น ม.6/2) *
                  </label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="ม.6/2"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่ *
                  </label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="15"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสนักเรียน (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="เช่น 54821"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-60"
            >
              {loading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกและเริ่มใช้งาน'}
            </button>
          </form>
        ) : (
          /* Welcome & Sign-in Screen */
          <div>
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 mb-1">
              <Recycle className="w-5 h-5 animate-spin-slow" />
              <h2 className="text-2xl font-bold font-mali text-emerald-800">
                Trash Point
              </h2>
            </div>
            <p className="text-xs text-slate-600 font-medium mb-3">
              ระบบสะสมคะแนนจากการเก็บและคัดแยกขยะ
            </p>

            {/* Slogan banner */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-[11px] text-emerald-900 leading-relaxed font-medium mb-4">
              "เก็บขยะ = ทำความดี | สะสมคะแนน = แลกรางวัล | รักษ์โลก = เริ่มที่เรา"
            </div>

            {/* Google Sign In (Production) */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-emerald-500 text-slate-800 font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition active:scale-98 disabled:opacity-60 mb-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'กำลังเชื่อมต่อบัญชี Google...' : 'เข้าสู่ระบบด้วยบัญชี Google'}</span>
            </button>

            {/* Quick Access Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">หรือเข้าใช้งานทันที</span>
              </div>
            </div>

            {/* Admin Quick Entry Button (65302040006@svc.ac.th) */}
            <button
              type="button"
              onClick={() => {
                loginAsAdminDirect();
                if (onClose) onClose();
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 mb-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>เข้าใช้งานในฐานะ Admin (65302040006@svc.ac.th)</span>
            </button>

            {/* Student Quick Entry Button */}
            <button
              type="button"
              onClick={() => {
                loginAsStudentDirect();
                if (onClose) onClose();
              }}
              className="w-full py-2 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 mb-3"
            >
              <UserCheck className="w-4 h-4 text-emerald-200" />
              <span>เข้าใช้งานด่วน (นักเรียน / ทดลองใช้)</span>
            </button>

            {/* Privacy Consent Checkbox */}
            <div className="flex items-start gap-2 text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-2">
              <input
                id="consentCheck"
                type="checkbox"
                checked={acceptedConsent}
                onChange={(e) => setAcceptedConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
              />
              <label htmlFor="consentCheck" className="text-[10px] text-slate-500 leading-tight">
                <strong>การยินยอมข้อมูลส่วนบุคคล:</strong> ข้อมูลชื่อ ระดับชั้น
                และภาพถ่ายหลักฐานจะถูกใช้เพื่อการบันทึกกิจกรรมสะสมแต้มของโรงเรียนเท่านั้น
              </label>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-1 py-1 text-xs text-slate-500 hover:text-slate-800 underline transition"
              >
                เข้าชมหน้าแอพก่อน
              </button>
            )}

            {errorMsg && (
              <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg text-left mt-2">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
