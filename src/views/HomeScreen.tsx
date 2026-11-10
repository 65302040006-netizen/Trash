/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  QrCode,
  History,
  Gift,
  Target,
  Award,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { CertificateModal } from '../components/CertificateModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Submission } from '../types';
import { getBangkokTodayString } from '../utils/dateFormatter';

interface HomeScreenProps {
  onNavigate: (tab: string, extra?: unknown) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { profile, settings } = useAuth();
  const [showCertificate, setShowCertificate] = useState(false);
  const [todayPieces, setTodayPieces] = useState(0);
  const [todayPoints, setTodayPoints] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const targetScore = settings.certificateTarget || 100;
  const totalEarned = profile?.totalEarned || 0;
  const balance = profile?.balance || 0;
  const hasCertificate = totalEarned >= targetScore;
  const progressPercent = Math.min(100, Math.round((totalEarned / targetScore) * 100));

  // Determine Eco Tier Badge
  let badgeTitle = '🌱 ต้นกล้ารักษ์โลก';
  if (totalEarned >= 100) badgeTitle = '🏆 แชมป์นักอนุรักษ์';
  else if (totalEarned >= 50) badgeTitle = '🌟 ผู้พิทักษ์ธรรมชาติ';
  else if (totalEarned >= 20) badgeTitle = '🌿 สมาชิก Green Member';

  // Fetch today's summary for current user
  useEffect(() => {
    if (!profile?.uid) return;

    async function loadTodayStats() {
      try {
        const todayKey = getBangkokTodayString();
        const q = query(
          collection(db, 'submissions'),
          where('userId', '==', profile!.uid)
        );
        const snap = await getDocs(q);
        let pieces = 0;
        let points = 0;

        snap.forEach((doc) => {
          const sub = doc.data() as Submission;
          if (sub.createdAt && sub.createdAt.startsWith(todayKey) && sub.status === 'approved') {
            pieces += sub.approvedPieces || sub.pieces || 0;
            points += sub.points || 0;
          }
        });

        setTodayPieces(pieces);
        setTodayPoints(points);
      } catch (err) {
        console.warn('Load today stats error:', err);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadTodayStats();
  }, [profile?.uid]);

  return (
    <div className="space-y-4 pb-6">
      {/* School Announcement Banner if set */}
      {settings.announcement && (
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-3 rounded-2xl shadow-sm flex items-center gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-300 animate-pulse" />
          <span className="line-clamp-2 leading-relaxed">{settings.announcement}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-2xl shadow-inner">
            {profile?.avatar === 'avatar_2'
              ? '👧'
              : profile?.avatar === 'avatar_3'
              ? '🌱'
              : profile?.avatar === 'avatar_4'
              ? '🦊'
              : profile?.avatar === 'avatar_5'
              ? '🐼'
              : '🧑‍🎓'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-slate-900 text-base leading-snug">
                {profile?.name || 'นักเรียน'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {profile?.className || 'ม.6/2'} {profile?.number ? `• เลขที่ ${profile.number}` : ''}
            </p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              {badgeTitle}
            </span>
          </div>
        </div>

        {/* Mascot Mini Greeting */}
        <div className="w-16 h-16 flex-shrink-0">
          <Mascot mood="happy" size="sm" className="scale-125" />
        </div>
      </div>

      {/* Points & Certificate Progress Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 text-white p-5 shadow-lg shadow-emerald-700/20">
        {/* Background decorative circles */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-amber-400/15 blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
            <span className="font-medium flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              คะแนนสะสมคงเหลือ (แลกของรางวัล)
            </span>
            <span className="text-[11px] opacity-90">สะสมรวม: {totalEarned} แต้ม</span>
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className="text-4xl font-extrabold font-mali tracking-tight text-white drop-shadow-sm">
              {balance}
            </span>
            <span className="text-sm font-semibold text-amber-300">คะแนน</span>
          </div>

          {/* Certificate Progress Bar */}
          <div className="mt-4 pt-3 border-t border-emerald-500/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1 text-emerald-100 font-medium">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                เป้าหมายเกียรติบัตรนักอนุรักษ์ (100 แต้ม)
              </span>
              <span className="font-bold text-amber-300">
                {hasCertificate ? 'สำเร็จแล้ว!' : `${totalEarned}/${targetScore}`}
              </span>
            </div>

            <div className="w-full bg-emerald-950/40 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-400/30">
              <div
                className="bg-gradient-to-r from-amber-300 to-yellow-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {hasCertificate ? (
              <button
                onClick={() => setShowCertificate(true)}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-98"
              >
                <Award className="w-4 h-4 text-emerald-950" />
                <span>คลิกเพื่อดูและพิมพ์เกียรติบัตรของคุณ 📜</span>
              </button>
            ) : (
              <p className="text-[11px] text-emerald-200 mt-1.5 text-right">
                เก็บอีกเพียง <strong className="text-white font-bold">{targetScore - totalEarned}</strong> คะแนน จะได้รับเกียรติบัตร
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4 Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quick Action 1: Scan QR */}
        <button
          onClick={() => onNavigate('scan')}
          className="p-4 rounded-3xl bg-white hover:bg-emerald-50/50 border border-emerald-100 shadow-sm text-left transition active:scale-98 group flex flex-col justify-between h-28"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
              <QrCode className="w-6 h-6" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">สแกนส่งขยะ</h3>
            <p className="text-[11px] text-slate-500">สแกน QR ที่จุดทิ้งขยะ</p>
          </div>
        </button>

        {/* Quick Action 2: History */}
        <button
          onClick={() => onNavigate('history')}
          className="p-4 rounded-3xl bg-white hover:bg-emerald-50/50 border border-emerald-100 shadow-sm text-left transition active:scale-98 group flex flex-col justify-between h-28"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition">
              <History className="w-6 h-6" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">ประวัติของฉัน</h3>
            <p className="text-[11px] text-slate-500">ตรวจสอบสถานะการอนุมัติ</p>
          </div>
        </button>

        {/* Quick Action 3: Daily Missions */}
        <button
          onClick={() => onNavigate('missions')}
          className="p-4 rounded-3xl bg-white hover:bg-emerald-50/50 border border-emerald-100 shadow-sm text-left transition active:scale-98 group flex flex-col justify-between h-28"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
              <Target className="w-6 h-6" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">ภารกิจวันนี้</h3>
            <p className="text-[11px] text-slate-500">ทำภารกิจรับโบนัสแต้ม</p>
          </div>
        </button>

        {/* Quick Action 4: Rewards */}
        <button
          onClick={() => onNavigate('rewards')}
          className="p-4 rounded-3xl bg-white hover:bg-emerald-50/50 border border-emerald-100 shadow-sm text-left transition active:scale-98 group flex flex-col justify-between h-28"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition">
              <Gift className="w-6 h-6" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">แลกรางวัล</h3>
            <p className="text-[11px] text-slate-500">ขนม เครื่องเขียน ของสะสม</p>
          </div>
        </button>
      </div>

      {/* Today / Weekly Summary Section */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>สรุปผลงานความดีของคุณ</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
            วันนี้
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 text-center">
            <span className="text-2xl font-black text-emerald-700 font-mali">
              {todayPieces}
            </span>
            <span className="block text-xs text-slate-600 mt-0.5">ชิ้นที่เก็บวันนี้</span>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-black text-amber-700 font-mali">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500 inline" />
              <span>+{todayPoints}</span>
            </div>
            <span className="block text-xs text-slate-600 mt-0.5">คะแนนที่ได้รับวันนี้</span>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5 justify-center">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>เก็บขยะทั่วไป 5 ชิ้นขึ้นไป = 1 แต้ม/ชิ้น | รีไซเคิล = 2 แต้ม/ชิ้น</span>
        </div>
      </div>

      {/* Certificate Modal View */}
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
