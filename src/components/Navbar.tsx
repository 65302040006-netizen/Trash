/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Recycle, ShieldCheck, ClipboardCheck, User, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadCount?: number;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  unreadCount = 0,
  onOpenAuth,
}) => {
  const { profile, role, switchRole, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-emerald-600 text-white shadow-md">
      <div className="max-w-[430px] mx-auto px-3.5 py-2.5 flex items-center justify-between">
        {/* App Brand Logo */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-amber-300">
            <Recycle className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <span className="font-mali font-bold text-lg leading-tight text-white tracking-wide">
              Trash Point
            </span>
            <span className="block text-[10px] text-emerald-100 -mt-1 font-light">
              ระบบสะสมแต้มโรงเรียนสีเขียว
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* PWA Install */}
          <PWAInstallButton />

          {/* Admin / Reviewer Console Button (Shown ONLY for real authorized staff) */}
          {role === 'admin' ? (
            <button
              onClick={() => {
                if (currentTab === 'admin') onSelectTab('home');
                else onSelectTab('admin');
              }}
              className={`p-1.5 px-2.5 rounded-xl transition text-xs flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'bg-amber-400 text-slate-900 font-bold shadow-xs'
                  : 'bg-purple-800 hover:bg-purple-900 text-amber-200'
              }`}
              title="สลับโหมดแอดมิน"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] font-bold">แอดมิน</span>
            </button>
          ) : role === 'reviewer' ? (
            <button
              onClick={() => {
                if (currentTab === 'reviewer') onSelectTab('home');
                else onSelectTab('reviewer');
              }}
              className={`p-1.5 px-2.5 rounded-xl transition text-xs flex items-center gap-1.5 ${
                currentTab === 'reviewer'
                  ? 'bg-amber-400 text-slate-900 font-bold shadow-xs'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              title="สลับโหมดตรวจงาน"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-[11px] font-bold">ตรวจงาน</span>
            </button>
          ) : null}

          {/* Notification Bell */}
          <button
            onClick={() => onSelectTab('notifications')}
            className={`relative p-2 rounded-full transition ${
              currentTab === 'notifications'
                ? 'bg-emerald-700 text-amber-300'
                : 'hover:bg-emerald-700 text-white'
            }`}
            aria-label="แจ้งเตือน"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
