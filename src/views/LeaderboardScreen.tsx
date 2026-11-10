/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Users,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatThaiDateTime } from '../utils/dateFormatter';

export const LeaderboardScreen: React.FC = () => {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('totalEarned', 'desc'), limit(50));
        const snap = await getDocs(q);

        const list: UserProfile[] = [];
        snap.forEach((doc) => {
          const u = doc.data() as UserProfile;
          // Filter students or demo accounts
          if (!u.disabled) {
            list.push({ ...u, uid: doc.id });
          }
        });

        // If list is empty (new database), provide mock initial student entries so the podium looks active
        if (list.length === 0) {
          const sampleStudents: UserProfile[] = [
            {
              uid: 'mock_1',
              name: 'กิตติศักดิ์ พิทักษ์โลก',
              className: 'ม.6/1',
              number: '4',
              avatar: 'avatar_1',
              role: 'student',
              totalEarned: 180,
              balance: 80,
              totalPieces: 95,
              certificateEarned: true,
              createdAt: new Date().toISOString(),
            },
            {
              uid: 'mock_2',
              name: 'ปิยะดา รักษ์สิ่งแวดล้อม',
              className: 'ม.5/3',
              number: '12',
              avatar: 'avatar_2',
              role: 'student',
              totalEarned: 145,
              balance: 55,
              totalPieces: 72,
              certificateEarned: true,
              createdAt: new Date().toISOString(),
            },
            {
              uid: 'mock_3',
              name: 'ธนากร สะอาดดี',
              className: 'ม.6/2',
              number: '8',
              avatar: 'avatar_3',
              role: 'student',
              totalEarned: 110,
              balance: 30,
              totalPieces: 58,
              certificateEarned: true,
              createdAt: new Date().toISOString(),
            },
            {
              uid: 'mock_4',
              name: 'ณิชาภา เขียวสดใส',
              className: 'ม.4/2',
              number: '21',
              avatar: 'avatar_5',
              role: 'student',
              totalEarned: 85,
              balance: 40,
              totalPieces: 45,
              certificateEarned: false,
              createdAt: new Date().toISOString(),
            },
          ];
          setLeaderboard(sampleStudents);
        } else {
          setLeaderboard(list);
        }

        setLastUpdated(formatThaiDateTime(new Date()));
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Filter by selected classroom if applicable
  const filteredList = leaderboard.filter((item) => {
    if (selectedClass === 'all') return true;
    return item.className?.startsWith(selectedClass);
  });

  // Extract distinct grade classes for filter dropdown
  const gradeOptions = ['all', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

  const top1 = filteredList[0];
  const top2 = filteredList[1];
  const top3 = filteredList[2];
  const restList = filteredList.slice(3);

  const getAvatarEmoji = (avatar?: string) => {
    switch (avatar) {
      case 'avatar_2':
        return '👧';
      case 'avatar_3':
        return '🌱';
      case 'avatar_4':
        return '🦊';
      case 'avatar_5':
        return '🐼';
      default:
        return '🧑‍🎓';
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-xl font-bold font-mali text-slate-900">
              อันดับนักอนุรักษ์
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            คำนวณจากคะแนนสะสมรวมทั้งหมด (Total Earned)
          </p>
        </div>

        {/* Classroom Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 shadow-xs focus:outline-none pr-6"
          >
            <option value="all">ทุกระดับชั้น</option>
            {gradeOptions.slice(1).map((g) => (
              <option key={g} value={g}>
                ชั้น {g}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Period Tabs: สัปดาห์นี้ | รายเดือน | ตลอดกาล */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setPeriod('week')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
            period === 'week'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          สัปดาห์นี้
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
            period === 'month'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          รายเดือน
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
            period === 'all'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ตลอดกาล
        </button>
      </div>

      {/* Podium for Top 3 */}
      {top1 && (
        <div className="bg-gradient-to-b from-emerald-600 to-green-800 rounded-3xl p-4 shadow-lg text-white">
          <div className="flex items-center justify-between text-xs text-emerald-100 mb-3">
            <span className="font-semibold flex items-center gap-1">
              <Crown className="w-4 h-4 text-amber-300" />
              สุดยอดแชมป์นักอนุรักษ์โรงเรียน
            </span>
            <span className="text-[10px] text-emerald-200">อัปเดต: {lastUpdated}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
            {/* Rank 2 (Silver) */}
            {top2 ? (
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-1">
                  <div className="w-13 h-13 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-2xl shadow-md">
                    {getAvatarEmoji(top2.avatar)}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-bold text-[10px] flex items-center justify-center border border-white">
                    2
                  </span>
                </div>
                <span className="font-bold text-xs truncate max-w-[90px] block">
                  {top2.name}
                </span>
                <span className="text-[10px] text-emerald-200">{top2.className}</span>
                <div className="bg-white/20 rounded-xl px-2 py-0.5 mt-1 font-bold font-mali text-amber-300 text-xs">
                  {top2.totalEarned} แต้ม
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Rank 1 (Gold - Center & Elevated) */}
            <div className="flex flex-col items-center text-center -mt-3">
              <div className="relative mb-1">
                <div className="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center text-3xl shadow-lg ring-4 ring-amber-400/30">
                  {getAvatarEmoji(top1.avatar)}
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Crown className="w-6 h-6 text-amber-300 fill-amber-300 drop-shadow-sm" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                  1
                </span>
              </div>
              <span className="font-bold text-sm truncate max-w-[100px] block text-amber-200">
                {top1.name}
              </span>
              <span className="text-[10px] text-emerald-200">{top1.className}</span>
              <div className="bg-amber-400 text-amber-950 font-black font-mali text-sm rounded-xl px-2.5 py-0.5 mt-1 shadow-sm">
                {top1.totalEarned} แต้ม
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            {top3 ? (
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-1">
                  <div className="w-13 h-13 rounded-full bg-amber-50 border-2 border-amber-600 flex items-center justify-center text-2xl shadow-md">
                    {getAvatarEmoji(top3.avatar)}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center border border-white">
                    3
                  </span>
                </div>
                <span className="font-bold text-xs truncate max-w-[90px] block">
                  {top3.name}
                </span>
                <span className="text-[10px] text-emerald-200">{top3.className}</span>
                <div className="bg-white/20 rounded-xl px-2 py-0.5 mt-1 font-bold font-mali text-amber-300 text-xs">
                  {top3.totalEarned} แต้ม
                </div>
              </div>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Ranks 4+ List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 px-1">
          อันดับนักเรียนทั้งหมด ({filteredList.length} คน)
        </h4>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">
            กำลังโหลดอันดับ...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            ไม่พบข้อมูลในชั้นเรียนนี้
          </div>
        ) : (
          filteredList.map((item, index) => {
            const rank = index + 1;
            const isCurrentUser = profile?.uid === item.uid;

            return (
              <div
                key={item.uid || index}
                className={`p-3 rounded-2xl flex items-center justify-between transition ${
                  isCurrentUser
                    ? 'bg-emerald-50 border-2 border-emerald-500 shadow-sm'
                    : 'bg-white border border-slate-100 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Number */}
                  <span
                    className={`w-6 text-center font-bold text-xs ${
                      rank === 1
                        ? 'text-amber-500 font-extrabold'
                        : rank === 2
                        ? 'text-slate-500 font-extrabold'
                        : rank === 3
                        ? 'text-amber-700 font-extrabold'
                        : 'text-slate-400'
                    }`}
                  >
                    #{rank}
                  </span>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                    {getAvatarEmoji(item.avatar)}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800">
                        {item.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.2 rounded-md">
                          (คุณ)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {item.className} {item.number ? `เลขที่ ${item.number}` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mali text-emerald-700 text-sm flex items-center gap-0.5 justify-end">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {item.totalEarned}
                  </span>
                  <span className="text-[9px] text-slate-400 block">คะแนนสะสม</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
