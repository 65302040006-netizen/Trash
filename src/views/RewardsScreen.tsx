/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gift,
  Star,
  CheckCircle2,
  Clock,
  QrCode,
  Package,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Reward, Redemption } from '../types';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { formatThaiDateTime } from '../utils/dateFormatter';
import { QRCodeModal } from '../components/QRCodeModal';
import confetti from 'canvas-confetti';
import { Mascot } from '../components/Mascot';

export const RewardsScreen: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'my_redemptions'>('catalog');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  // Redemption flow state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // QR Code Modal for pickup
  const [qrModalItem, setQrModalItem] = useState<Redemption | null>(null);

  // Fetch Rewards Catalog in realtime
  useEffect(() => {
    const q = query(collection(db, 'rewards'), where('active', '==', true));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Reward[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Reward, 'id'>) });
        });
        setRewards(list);
        setLoading(false);
      },
      (err) => {
        console.error('Rewards load error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Current User's Redemptions
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'redemptions'),
      where('userId', '==', profile.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Redemption[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Redemption, 'id'>) });
        });
        // Newest first
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRedemptions(list);
      },
      (err) => {
        console.warn('Redemptions load warning:', err);
      }
    );
    return () => unsubscribe();
  }, [profile?.uid]);

  // Execute Firestore Transaction for safe point and stock deduction
  const handleConfirmRedeem = async () => {
    if (!profile?.uid || !selectedReward || redeeming) return;

    if (profile.balance < selectedReward.cost) {
      setErrorMessage('คะแนนสะสมคงเหลือของคุณไม่เพียงพอสำหรับของรางวัลนี้');
      return;
    }

    if (selectedReward.stock <= 0) {
      setErrorMessage('ขออภัย ของรางวัลนี้หมดแล้ว');
      return;
    }

    setRedeeming(true);
    setErrorMessage('');

    try {
      // Short friendly pickup code, e.g. TP-4921
      const randomCode = `TP-${Math.floor(1000 + Math.random() * 9000)}`;
      const userRef = doc(db, 'users', profile.uid);
      const rewardRef = doc(db, 'rewards', selectedReward.id);
      const redemptionRef = doc(collection(db, 'redemptions'));

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const rewardDoc = await transaction.get(rewardRef);

        if (!userDoc.exists() || !rewardDoc.exists()) {
          throw new Error('ไม่พบข้อมูลผู้ใช้หรือของรางวัล');
        }

        const currentBalance = userDoc.data().balance || 0;
        const currentStock = rewardDoc.data().stock || 0;

        if (currentBalance < selectedReward.cost) {
          throw new Error('คะแนนคงเหลือไม่เพียงพอ');
        }
        if (currentStock <= 0) {
          throw new Error('ของรางวัลหมดสต็อกแล้ว');
        }

        // Deduct user balance (totalEarned stays intact!)
        transaction.update(userRef, {
          balance: currentBalance - selectedReward.cost,
        });

        // Deduct inventory stock
        transaction.update(rewardRef, {
          stock: currentStock - 1,
        });

        // Create redemption record
        const newRedemption: Omit<Redemption, 'id'> = {
          userId: profile.uid,
          userName: profile.name,
          className: profile.className,
          rewardId: selectedReward.id,
          rewardName: selectedReward.name,
          cost: selectedReward.cost,
          code: randomCode,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        transaction.set(redemptionRef, newRedemption);
      });

      // Confetti fireworks!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFC93C', '#2E9E4F', '#10B981', '#EC4899'],
      });

      await refreshProfile();
      setSelectedReward(null);
      setActiveTab('my_redemptions');
    } catch (err: unknown) {
      console.error('Redemption transaction error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการแลกรางวัล'
      );
    } finally {
      setRedeeming(false);
    }
  };

  const getRewardIcon = (iconName: string) => {
    switch (iconName) {
      case 'notebook':
        return '📓';
      case 'pen':
        return '🖊️';
      case 'keychain':
        return '🔑';
      case 'bag':
        return '🛍️';
      case 'pencil':
        return '✏️';
      case 'snack':
        return '🍿';
      case 'milk':
        return '🥛';
      case 'toy':
        return '🧸';
      default:
        return '🎁';
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* User Balance Header Card */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-4.5 shadow-md text-slate-900 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-amber-950 flex items-center gap-1">
            <Gift className="w-4 h-4 text-emerald-900" />
            คะแนนสะสมที่ใช้แลกได้
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-3xl font-black font-mali tracking-tight">
              {profile?.balance || 0}
            </span>
            <span className="text-xs font-bold text-amber-950">คะแนน</span>
          </div>
          <span className="text-[10px] text-amber-900 opacity-90 block mt-0.5">
            *การแลกรางวัลไม่ส่งผลต่อคะแนนเกียรติบัตรและอันดับ
          </span>
        </div>

        <div className="w-14 h-14 flex-shrink-0">
          <Mascot mood="excited" size="sm" className="scale-125" />
        </div>
      </div>

      {/* Tab Selector: รายการรางวัล | ของรางวัลที่แลกแล้ว */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'catalog'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>รางวัลที่แลกได้</span>
        </button>
        <button
          onClick={() => setActiveTab('my_redemptions')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'my_redemptions'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>
            ของที่แลกแล้ว ({redemptions.filter((r) => r.status === 'pending').length})
          </span>
        </button>
      </div>

      {/* Tab 1: Reward Catalog Grid */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">
              กำลังโหลดรายการของรางวัล...
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              ยังไม่มีของรางวัลในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((reward) => {
                const userBalance = profile?.balance || 0;
                const canAfford = userBalance >= reward.cost;
                const inStock = reward.stock > 0;

                return (
                  <div
                    key={reward.id}
                    className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition"
                  >
                    <div>
                      {/* Icon & Stock Badge */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-50 to-emerald-50 border border-slate-100 flex items-center justify-center text-2xl shadow-inner">
                          {getRewardIcon(reward.icon)}
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            inStock
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {inStock ? `เหลือ ${reward.stock} ชิ้น` : 'ของหมด'}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                        {reward.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {reward.category}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500">ใช้คะแนน:</span>
                        <span className="text-sm font-black font-mali text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {reward.cost}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setErrorMessage('');
                          setSelectedReward(reward);
                        }}
                        disabled={!canAfford || !inStock}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                          canAfford && inStock
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {!inStock
                          ? 'ของหมด'
                          : !canAfford
                          ? `ขาดอีก ${reward.cost - userBalance} แต้ม`
                          : 'แลกของรางวัล'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Redemptions History */}
      {activeTab === 'my_redemptions' && (
        <div className="space-y-3">
          {redemptions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-xs">ยังไม่มีรายการแลกรางวัล</h4>
              <p className="text-[11px] text-slate-400">
                สะสมแต้มจากการเก็บขยะ แล้วนำมาแลกของรางวัลได้ที่นี่
              </p>
            </div>
          ) : (
            redemptions.map((red) => {
              const isPending = red.status === 'pending';
              return (
                <div
                  key={red.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-xs text-slate-800 leading-snug">
                        {red.rewardName}
                      </h4>
                      {isPending ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-amber-600" />
                          รอรับของ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          รับแล้ว
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>รหัส: <strong className="font-mono text-emerald-700">{red.code}</strong></span>
                      <span>• {formatThaiDateTime(red.createdAt)}</span>
                    </div>

                    {red.deliveredAt && (
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        ส่งมอบโดย: {red.deliveredBy || 'ครูผู้ดูแล'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setQrModalItem(red)}
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex flex-col items-center flex-shrink-0 transition active:scale-95 border border-emerald-200"
                    title="แสดง QR โค้ดรับของ"
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-0.5">ดูโค้ด</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-3xl flex items-center justify-center mx-auto shadow-inner">
              {getRewardIcon(selectedReward.icon)}
            </div>

            <h3 className="text-base font-bold font-mali text-slate-900">
              ยืนยันการแลกของรางวัล
            </h3>
            <p className="text-xs text-slate-600">
              ต้องการใช้คะแนนสะสม <strong>{selectedReward.cost} คะแนน</strong>
              <br />
              เพื่อแลกรับ <strong>"{selectedReward.name}"</strong> ใช่หรือไม่?
            </p>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 text-left">
              <span className="font-bold block mb-0.5">📌 สิ่งที่จะได้รับ:</span>
              <p className="leading-relaxed text-[11px]">
                ระบบจะสร้าง "โค้ดรับรางวัลพร้อม QR" ให้นำไปแสดงแก่ครูหรือสภานักเรียนเพื่อรับของจริง
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl text-left">
                {errorMessage}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {redeeming ? 'กำลังแลกรางวัล...' : 'ยืนยันการแลก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Pickup Modal */}
      {qrModalItem && (
        <QRCodeModal
          isOpen={!!qrModalItem}
          onClose={() => setQrModalItem(null)}
          title={qrModalItem.rewardName}
          subtitle={`แสดง QR หรือโค้ด "${qrModalItem.code}" ให้ครูหรือทีมงานเพื่อรับของ`}
          codeValue={qrModalItem.code}
        />
      )}
    </div>
  );
};
