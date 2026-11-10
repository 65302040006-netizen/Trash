/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Target,
  Gift,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Mission, Submission } from '../types';
import { collection, getDocs, query, where, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getBangkokTodayString } from '../utils/dateFormatter';
import confetti from 'canvas-confetti';
import { Mascot } from '../components/Mascot';

export const MissionsScreen: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Progress metrics computed from today's approved submissions
  const [todaySubmissions, setTodaySubmissions] = useState<Submission[]>([]);
  const [claimedMissions, setClaimedMissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadMissionsAndProgress() {
      if (!profile?.uid) return;
      try {
        // 1. Load active missions
        const misQuery = query(collection(db, 'missions'), where('active', '==', true));
        const misSnap = await getDocs(misQuery);
        const misList: Mission[] = [];
        misSnap.forEach((doc) => {
          misList.push({ id: doc.id, ...(doc.data() as Omit<Mission, 'id'>) });
        });
        setMissions(misList);

        // 2. Load today's approved submissions for Asia/Bangkok
        const todayKey = getBangkokTodayString();
        const subQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', profile.uid)
        );
        const subSnap = await getDocs(subQuery);
        const todayApproved: Submission[] = [];
        subSnap.forEach((doc) => {
          const item = doc.data() as Omit<Submission, 'id'>;
          if (item.createdAt && item.createdAt.startsWith(todayKey) && item.status === 'approved') {
            todayApproved.push({ id: doc.id, ...item });
          }
        });
        setTodaySubmissions(todayApproved);

        // 3. Load user's claimed mission bonuses for today from local storage or Firestore
        const savedClaimed = localStorage.getItem(`trashpoint_claimed_${profile.uid}_${todayKey}`);
        if (savedClaimed) {
          setClaimedMissions(JSON.parse(savedClaimed));
        }
      } catch (err) {
        console.error('Missions load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMissionsAndProgress();
  }, [profile?.uid]);

  // Calculate current progress for a given mission
  const calculateProgress = (mission: Mission): number => {
    if (mission.targetType === 'general') {
      return todaySubmissions
        .filter((s) => s.type === 'general')
        .reduce((sum, s) => sum + (s.approvedPieces || s.pieces || 0), 0);
    }
    if (mission.targetType === 'recycle') {
      return todaySubmissions
        .filter((s) => s.type === 'recycle' || s.type === 'paper')
        .reduce((sum, s) => sum + (s.approvedPieces || s.pieces || 0), 0);
    }
    if (mission.targetType === 'share') {
      return todaySubmissions.length;
    }
    // 'any' or stadium/location specific
    return todaySubmissions.reduce((sum, s) => sum + (s.approvedPieces || s.pieces || 0), 0);
  };

  // Claim Mission Bonus
  const handleClaim = async (mission: Mission) => {
    if (!profile?.uid || claiming) return;
    setClaiming(mission.id);

    try {
      const todayKey = getBangkokTodayString();
      const updatedClaims = { ...claimedMissions, [mission.id]: true };
      setClaimedMissions(updatedClaims);
      localStorage.setItem(
        `trashpoint_claimed_${profile.uid}_${todayKey}`,
        JSON.stringify(updatedClaims)
      );

      // Increment user points in Firestore
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balance: increment(mission.bonusPoints),
        totalEarned: increment(mission.bonusPoints),
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFC93C', '#2E9E4F', '#10B981'],
      });

      await refreshProfile();
    } catch (err) {
      console.error('Claim mission bonus error:', err);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5">
          <Target className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold font-mali text-slate-900">
            ภารกิจวันนี้
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          ทำภารกิจให้สำเร็จ รับคะแนนพิเศษเพื่อโรงเรียนสีเขียว! (รีเซ็ตทุกเที่ยงคืน)
        </p>
      </div>

      {/* Daily Motivation Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-emerald-200 flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
            โบนัสประจำวัน
          </span>
          <h3 className="text-sm font-bold font-mali leading-snug">
            สะสมแต้มไวขึ้น เพียงทำตามเป้าหมาย
          </h3>
          <p className="text-[11px] text-emerald-100 opacity-90">
            แต้มจะถูกนับเมื่อหลักฐานได้รับการอนุมัติจากครูแล้ว
          </p>
        </div>
        <div className="w-14 h-14 flex-shrink-0">
          <Mascot mood="happy" size="sm" className="scale-125" />
        </div>
      </div>

      {/* Missions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            กำลังโหลดภารกิจประจำวัน...
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            ไม่มีภารกิจในวันนี้
          </div>
        ) : (
          missions.map((mission) => {
            const currentCount = calculateProgress(mission);
            const isCompleted = currentCount >= mission.targetCount;
            const isClaimed = !!claimedMissions[mission.id];
            const percent = Math.min(
              100,
              Math.round((currentCount / mission.targetCount) * 100)
            );

            return (
              <div
                key={mission.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm transition ${
                  isClaimed
                    ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                    : isCompleted
                    ? 'border-amber-400 ring-2 ring-amber-300/30'
                    : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug flex items-center gap-1.5">
                      {isClaimed && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      )}
                      <span>{mission.title}</span>
                    </h4>
                    {mission.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {mission.description}
                      </p>
                    )}
                  </div>

                  <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    +{mission.bonusPoints} แต้ม
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 my-2">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>ความคืบหน้า</span>
                    <span className="font-bold text-slate-700">
                      {currentCount} / {mission.targetCount}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-amber-400 to-emerald-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-1 flex justify-end">
                  {isClaimed ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-xl">
                      ✓ รับโบนัสแล้ว
                    </span>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaim(mission)}
                      disabled={claiming === mission.id}
                      className="py-1.5 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1"
                    >
                      <Gift className="w-3.5 h-3.5 text-slate-900" />
                      <span>{claiming === mission.id ? 'กำลังรับ...' : 'กดรับคะแนนโบนัส!'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      กำลังทำภารกิจ
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Weekly Streak Card */}
      <div className="bg-gradient-to-br from-amber-100/80 to-yellow-50 rounded-3xl p-4 border border-amber-300/80 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
            <Award className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-amber-950">
              โบนัสประจำสัปดาห์ (Super Streak)
            </h4>
            <p className="text-[10px] text-amber-800">
              เก็บขยะติดต่อกัน 5 วันในสัปดาห์นี้
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-700 mt-2 leading-relaxed">
          ร่วมกิจกรรมสม่ำเสมอ รับคะแนนพิเศษเพิ่มทันที <strong>+10 คะแนน</strong> เมื่อสะสมครบสัปดาห์!
        </p>

        <div className="flex justify-between items-center mt-3 pt-2 border-t border-amber-200 text-xs">
          <span className="text-amber-900 font-medium">สถิติสัปดาห์นี้: 3/5 วัน</span>
          <span className="font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md">
            +10 โบนัส
          </span>
        </div>
      </div>
    </div>
  );
};
