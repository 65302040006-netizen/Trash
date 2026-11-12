/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Recycle, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  unreadCount = 0,
}) => {
  const { profile, role, switchRole } = useAuth();

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

          {/* Reviewer / Admin Quick Switch for Authorized Staff */}
          {(role === 'reviewer' || role === 'admin') && (
            <div className="relative group">
              <button
                onClick={() => {
                  if (currentTab === 'reviewer') onSelectTab('home');
                  else if (currentTab === 'admin') onSelectTab('home');
                  else if (role === 'admin') onSelectTab('admin');
                  else onSelectTab('reviewer');
                }}
                className={`p-1.5 rounded-full transition text-xs flex items-center gap-1 ${
                  currentTab === 'reviewer' || currentTab === 'admin'
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'bg-emerald-700/80 hover:bg-emerald-700 text-amber-200'
                }`}
                title="สลับโหมดครู/แอดมิน"
              >
                {role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <ClipboardCheck className="w-4 h-4" />
                )}
                <span className="text-[11px] pr-1">
                  {role === 'admin' ? 'แอดมิน' : 'ตรวจงาน'}
                </span>
              </button>
            </div>
          )}

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
