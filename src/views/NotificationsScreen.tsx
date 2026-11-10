/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Star,
  XCircle,
  Award,
  Gift,
  Megaphone,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatThaiDateTime } from '../utils/dateFormatter';
import { Mascot } from '../components/Mascot';

export const NotificationsScreen: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to user notifications (specific user or "all")
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [profile.uid, 'all'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: AppNotification[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<AppNotification, 'id'>) });
        });
        // Sort newest first
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // If list is empty, supply initial helpful greeting notifications
        if (list.length === 0) {
          const sampleNotifications: AppNotification[] = [
            {
              id: 'notif_welcome',
              userId: profile.uid,
              type: 'announcement',
              title: 'ยินดีต้อนรับสู่ Trash Point! 🌱',
              message: 'เริ่มสะสมคะแนนจากการเก็บขยะในโรงเรียนได้ทันที ถ่ายภาพส่งหลักฐานเพื่อรับคะแนนสะสม',
              read: false,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'notif_cert',
              userId: profile.uid,
              type: 'certificate',
              title: 'เป้าหมายเกียรติบัตรนักอนุรักษ์ 📜',
              message: 'สะสมคะแนนรวมครบ 100 คะแนน รับเกียรติบัตรเชิดชูเกียรติจากผู้อำนวยการโรงเรียน',
              read: true,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
          ];
          setNotifications(sampleNotifications);
        } else {
          setNotifications(list);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Notifications fetch warning:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read && n.id && !n.id.startsWith('notif_welcome')) {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        }
      });
      await batch.commit();

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (e) {
      console.warn('Mark read warning:', e);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'points':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
        );
      case 'rejected':
        return (
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        );
      case 'certificate':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
        );
      case 'reward':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
        );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold font-mali text-slate-900">
              การแจ้งเตือน
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {unreadCount > 0
              ? `คุณมี ${unreadCount} รายการที่ยังไม่อ่าน`
              : 'อ่านครบทุกรายการแล้ว'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3 rounded-xl transition border border-emerald-200"
          >
            <CheckCheck className="w-4 h-4" />
            <span>อ่านทั้งหมด</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            กำลังโหลดการแจ้งเตือน...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-2">
            <Mascot mood="happy" size="md" className="mx-auto" />
            <h4 className="font-bold text-slate-700 text-xs">ไม่มีการแจ้งเตือนในขณะนี้</h4>
            <p className="text-[11px] text-slate-400">
              เมื่อครูตรวจหลักฐานของคุณ หรือมีกิจกรรมใหม่ ข้อมูลจะแสดงที่นี่
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                !item.read
                  ? 'bg-emerald-50/50 border-emerald-200 shadow-xs'
                  : 'bg-white border-slate-100 shadow-2xs'
              }`}
            >
              {getNotificationIcon(item.type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">
                    {item.title}
                  </h4>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.message}
                </p>

                <span className="text-[10px] text-slate-400 block mt-1.5">
                  {formatThaiDateTime(item.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
