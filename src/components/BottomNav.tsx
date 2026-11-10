/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Trophy, QrCode, Bell, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg pb-safe">
      <div className="max-w-[430px] mx-auto px-2 flex items-center justify-around h-16 relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'home'
              ? 'text-emerald-600 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5">หน้าหลัก</span>
        </button>

        {/* Tab 2: Leaderboard */}
        <button
          onClick={() => onSelectTab('leaderboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'leaderboard'
              ? 'text-emerald-600 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Trophy className={`w-5 h-5 ${currentTab === 'leaderboard' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5">อันดับ</span>
        </button>

        {/* Floating Center Scan Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={() => onSelectTab('scan')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
              currentTab === 'scan'
                ? 'bg-amber-400 text-slate-900 ring-4 ring-emerald-500/30'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-4 ring-white'
            }`}
            aria-label="สแกน QR"
          >
            <QrCode className="w-6 h-6" />
            <span className="text-[9px] font-bold mt-0.5">สแกน</span>
          </button>
        </div>

        {/* Tab 4: Notifications */}
        <button
          onClick={() => onSelectTab('notifications')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-all ${
            currentTab === 'notifications'
              ? 'text-emerald-600 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Bell className={`w-5 h-5 ${currentTab === 'notifications' ? 'stroke-[2.5]' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[11px] mt-0.5">แจ้งเตือน</span>
        </button>

        {/* Tab 5: Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'profile'
              ? 'text-emerald-600 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className={`w-5 h-5 ${currentTab === 'profile' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] mt-0.5">โปรไฟล์</span>
        </button>
      </div>
    </nav>
  );
};
