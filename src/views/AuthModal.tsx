/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mascot } from '../components/Mascot';
import { useAuth } from '../context/AuthContext';
import {
  Recycle,
  ShieldCheck,
  UserCheck,
  ClipboardCheck,
  KeyRound,
  Lock,
  User as UserIcon,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export const AuthModal: React.FC<AuthModalProps> = () => {
  const { loginStudentDirectly, loginAsStaff } = useAuth();

  // Active Login Tab: 'student' | 'reviewer' | 'admin'
  const [activeTab, setActiveTab] = useState<'student' | 'reviewer' | 'admin'>('student');
  const [staffAuthType, setStaffAuthType] = useState<'credentials' | 'pin'>('pin');

  // Loading & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptedConsent, setAcceptedConsent] = useState(true);
  const [showSecret, setShowSecret] = useState(false);

  // Brute-force lockout timer state per staff tab
  const [failCount, setFailCount] = useState(0);
  const [lockRemaining, setLockRemaining] = useState(0);

  // Student Form State
  const [name, setName] = useState('');
  const [className, setClassName] = useState('ม.1/1');
  const [number, setNumber] = useState('1');
  const [studentId, setStudentId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_1');

  // Staff Credential Inputs (strictly empty, no prefilled usernames or weak defaults)
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPin, setStaffPin] = useState('');

  // Countdown lockout ticker
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) {
          setFailCount(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockRemaining]);

  const avatars = [
    { id: 'avatar_1', emoji: '🧑‍🎓', label: 'นักเรียน' },
    { id: 'avatar_2', emoji: '👧', label: 'สดใส' },
    { id: 'avatar_3', emoji: '🌱', label: 'ต้นกล้า' },
    { id: 'avatar_4', emoji: '🦊', label: 'จิ้งจอก' },
    { id: 'avatar_5', emoji: '🐼', label: 'แพนด้า' },
  ];

  const handleTabChange = (tab: 'student' | 'reviewer' | 'admin') => {
    setActiveTab(tab);
    setErrorMsg('');
    setShowSecret(false);
    setStaffUsername('');
    setStaffPassword('');
    setStaffPin('');
    setStaffAuthType(tab === 'admin' ? 'credentials' : 'pin');
  };

  // Student Info Form Submit (No Email / No Google needed)
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุลนักเรียน');
      return;
    }
    if (!acceptedConsent) {
      setErrorMsg('กรุณากดยินยอมข้อตกลงความเป็นส่วนตัวก่อนเข้าสู่ระบบ');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await loginStudentDirectly({
        name: name.trim(),
        className: className.trim(),
        number: number.trim(),
        studentId: studentId.trim(),
        avatar: selectedAvatar,
      });
    } catch (err) {
      console.error('Student login error:', err);
      setErrorMsg(
        err instanceof Error && err.message.includes('ระงับ')
          ? err.message
          : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setLoading(false);
    }
  };

  // Direct Staff (Admin / Reviewer) Login
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'student') return;

    if (lockRemaining > 0) {
      setErrorMsg(`ใส่รหัสผิดครบกำหนด กรุณารออีก ${lockRemaining} วินาที`);
      return;
    }

    const secret = staffAuthType === 'pin' ? staffPin.trim() : staffPassword.trim();
    const uname = staffUsername.trim();

    if (staffAuthType === 'credentials' && (!uname || !secret)) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }
    if (staffAuthType === 'pin' && !secret) {
      setErrorMsg('กรุณากรอกรหัส PIN');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await loginAsStaff(activeTab, staffAuthType, uname, secret);
      if (!res.ok) {
        const nextFails = failCount + 1;
        setFailCount(nextFails);
        if (nextFails >= MAX_FAILED_ATTEMPTS) {
          setLockRemaining(LOCKOUT_SECONDS);
          setErrorMsg(`ใส่รหัสผิด ${MAX_FAILED_ATTEMPTS} ครั้ง ระบบระงับชั่วคราว ${LOCKOUT_SECONDS} วินาที`);
        } else {
          setErrorMsg(
            `${res.reason || 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง'} (เหลือโอกาสอีก ${
              MAX_FAILED_ATTEMPTS - nextFails
            } ครั้ง)`
          );
        }
      } else {
        setFailCount(0);
      }
    } catch (err) {
      console.error('Staff login error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const isStaffTab = activeTab === 'admin' || activeTab === 'reviewer';

  return (
    <div className="w-full min-h-screen bg-slate-100 flex items-center justify-center p-3 py-6">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl text-center border border-emerald-100 my-auto">
        {/* Mascot Header */}
        <div className="flex justify-center -mt-12 mb-2">
          <div className="w-24 h-24 rounded-full bg-emerald-100/90 border-4 border-white flex items-center justify-center shadow-lg">
            <Mascot
              mood={
                activeTab === 'admin'
                  ? 'excited'
                  : activeTab === 'reviewer'
                  ? 'detective'
                  : 'happy'
              }
              size="md"
            />
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-1.5 text-emerald-700 mb-1">
          <Recycle className="w-5 h-5 animate-spin-slow" />
          <h1 className="text-2xl font-bold font-mali text-emerald-800">
            Trash Point
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-medium mb-3">
          ระบบสะสมคะแนนจากการเก็บและคัดแยกขยะสำหรับโรงเรียน
        </p>

        {/* 3-Role Tab Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleTabChange('student')}
            className={`py-2 px-1.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 ${
              activeTab === 'student'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>นักเรียน</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('reviewer')}
            className={`py-2 px-1.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 ${
              activeTab === 'reviewer'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>ครูผู้ตรวจ</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`py-2 px-1.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 ${
              activeTab === 'admin'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ผู้ดูแลระบบ</span>
          </button>
        </div>

        {/* TAB 1: STUDENT FORM LOGIN */}
        {activeTab === 'student' && (
          <div className="space-y-3 text-left">
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-emerald-950">
              <div className="flex items-center gap-1.5 mb-0.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-xs">เข้าสู่ระบบสำหรับนักเรียน</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                กรอกข้อมูลนักเรียนเพื่อเข้าใช้งานและสะสมคะแนนได้ทันที (ไม่ต้องใช้อีเมล)
              </p>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกรูปประจำตัว:
                </label>
                <div className="flex justify-between gap-1">
                  {avatars.map((av) => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`flex-1 py-1.5 rounded-xl text-lg transition flex flex-col items-center border ${
                        selectedAvatar === av.id
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{av.emoji}</span>
                      <span className="text-[9px] text-slate-600 mt-0.5">{av.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุลนักเรียน *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุลจริง"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับชั้น (เช่น ม.3/1) *
                  </label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="ม.3/1"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    placeholder="1"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสนักเรียน (ถ้ามี • ใช้กู้คืนคะแนนเดิมได้)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="กรอกเลขประจำตัวนักเรียน"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <input
                  id="consentCheck"
                  type="checkbox"
                  checked={acceptedConsent}
                  onChange={(e) => setAcceptedConsent(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 text-emerald-600 rounded-sm focus:ring-emerald-500"
                />
                <label htmlFor="consentCheck" className="text-[10px] text-slate-600 leading-tight">
                  <strong>การยินยอมข้อมูล:</strong> ข้อมูลชื่อ ชั้น และภาพถ่ายขยะจะถูกใช้เพื่อบันทึกกิจกรรมสะสมแต้มของโรงเรียนเท่านั้น
                </label>
              </div>

              {errorMsg && (
                <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบและเริ่มสะสมแต้ม'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2 & 3: REVIEWER & ADMIN LOGIN */}
        {isStaffTab && (
          <div className="space-y-3.5 text-left">
            <div
              className={`p-3 rounded-2xl border ${
                activeTab === 'admin'
                  ? 'bg-purple-50 border-purple-200 text-purple-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {activeTab === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                ) : (
                  <ClipboardCheck className="w-4 h-4 text-amber-700" />
                )}
                <span className="font-bold text-xs">
                  {activeTab === 'admin'
                    ? 'พอร์ทัลผู้ดูแลระบบ (Admin)'
                    : 'พอร์ทัลครูผู้ตรวจหลักฐาน'}
                </span>
              </div>
              <p
                className={`text-[11px] leading-relaxed ${
                  activeTab === 'admin' ? 'text-purple-700' : 'text-amber-800'
                }`}
              >
                {activeTab === 'admin'
                  ? 'ใส่ Username & Password หรือรหัส PIN เพื่อเข้าสู่ระบบทันที (ไม่ต้องใช้อีเมล)'
                  : 'ใส่รหัส PIN หรือ Username & Password เพื่อเข้าตรวจหลักฐานทันที (ไม่ต้องใช้อีเมล)'}
              </p>
            </div>

            {/* Auth Mode Switch */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setStaffAuthType('pin');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  staffAuthType === 'pin'
                    ? activeTab === 'admin'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>รหัส PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStaffAuthType('credentials');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  staffAuthType === 'credentials'
                    ? activeTab === 'admin'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Username & Password</span>
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} className="space-y-3">
              {staffAuthType === 'credentials' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อผู้ใช้ (Username) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        placeholder="กรอกชื่อผู้ใช้ที่ได้รับ"
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัสผ่าน (Password) *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่าน"
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        aria-label="แสดงหรือซ่อนรหัสผ่าน"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ใส่รหัส PIN เจ้าหน้าที่ *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      required
                      autoComplete="one-time-code"
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="กรอกรหัส PIN"
                      className="w-full pl-9 pr-9 py-3 text-center tracking-[0.25em] font-mono text-base font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50/50"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="absolute right-2.5 top-3.5 text-slate-400 hover:text-slate-600"
                      aria-label="แสดงหรือซ่อนรหัส PIN"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 text-center">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || lockRemaining > 0}
                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-60 flex items-center justify-center gap-1.5 mt-2 ${
                  activeTab === 'admin'
                    ? 'bg-purple-700 hover:bg-purple-800'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {activeTab === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                ) : (
                  <ClipboardCheck className="w-4 h-4 text-amber-100" />
                )}
                <span>
                  {lockRemaining > 0
                    ? `รอ ${lockRemaining} วินาที`
                    : loading
                    ? 'กำลังตรวจสอบสิทธิ์...'
                    : activeTab === 'admin'
                    ? 'เข้าสู่ระบบผู้ดูแลระบบ'
                    : 'เข้าสู่ระบบครูผู้ตรวจ'}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
