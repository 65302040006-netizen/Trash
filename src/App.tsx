/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './views/AuthModal';
import { HomeScreen } from './views/HomeScreen';
import { ScanQRScreen } from './views/ScanQRScreen';
import { SubmitScreen } from './views/SubmitScreen';
import { HistoryScreen } from './views/HistoryScreen';
import { MissionsScreen } from './views/MissionsScreen';
import { RewardsScreen } from './views/RewardsScreen';
import { LeaderboardScreen } from './views/LeaderboardScreen';
import { NotificationsScreen } from './views/NotificationsScreen';
import { ProfileScreen } from './views/ProfileScreen';
import { ReviewerDashboard } from './views/ReviewerDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { TrashLocation } from './types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';
import { WifiOff } from 'lucide-react';

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [scannedLocation, setScannedLocation] = useState<TrashLocation | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to unread notifications count for current user
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [profile.uid, 'all'])
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        let count = 0;
        snap.forEach((doc) => {
          if (!doc.data().read) count++;
        });
        setUnreadNotifications(count);
      },
      (err) => console.warn('Notif count warning:', err)
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  // Handle successful QR scan -> navigate to submit form with pre-filled location
  const handleScanSuccess = (location: TrashLocation) => {
    setScannedLocation(location);
    setCurrentTab('submit');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-700 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-12 h-12 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
        <span className="font-mali text-base font-bold tracking-wide">
          กำลังโหลด Trash Point...
        </span>
      </div>
    );
  }

  // If user is not authenticated or profile not set up yet
  if (!user || !profile || !profile.className) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3">
        <div className="w-full max-w-[430px] mx-auto min-h-screen bg-slate-100 flex items-center justify-center relative shadow-2xl overflow-hidden">
          <AuthModal />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 flex justify-center selection:bg-emerald-500 selection:text-white">
      {/* Mobile-first frame: max width 430px, centered on larger screens */}
      <div className="w-full max-w-[430px] min-h-screen bg-slate-50 relative flex flex-col shadow-2xl border-x border-slate-200/60 overflow-x-hidden">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs py-1 px-3 text-center flex items-center justify-center gap-1.5 font-medium z-40">
            <WifiOff className="w-3.5 h-3.5" />
            <span>โหมดออฟไลน์: กำลังใช้ข้อมูลที่บันทึกไว้ในเครื่อง</span>
          </div>
        )}

        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          unreadCount={unreadNotifications}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 pt-3">
          {currentTab === 'home' && (
            <HomeScreen
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'scan' && (
            <ScanQRScreen
              onScanSuccess={handleScanSuccess}
              onCancel={() => setCurrentTab('home')}
            />
          )}

          {currentTab === 'submit' && (
            <SubmitScreen
              initialLocation={scannedLocation}
              onSuccess={() => {
                setScannedLocation(null);
                setCurrentTab('history');
              }}
              onCancel={() => {
                setScannedLocation(null);
                setCurrentTab('home');
              }}
            />
          )}

          {currentTab === 'history' && (
            <HistoryScreen onGoToSubmit={() => setCurrentTab('submit')} />
          )}

          {currentTab === 'missions' && <MissionsScreen />}

          {currentTab === 'rewards' && <RewardsScreen />}

          {currentTab === 'leaderboard' && <LeaderboardScreen />}

          {currentTab === 'notifications' && <NotificationsScreen />}

          {currentTab === 'profile' && (
            <ProfileScreen
              onNavigateToRole={(target) => setCurrentTab(target)}
            />
          )}

          {currentTab === 'reviewer' && (
            <ReviewerDashboard onBackToHome={() => setCurrentTab('home')} />
          )}

          {currentTab === 'admin' && (
            <AdminDashboard onBackToHome={() => setCurrentTab('home')} />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'scan') {
              setScannedLocation(null);
            }
            setCurrentTab(tab);
          }}
          unreadCount={unreadNotifications}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
