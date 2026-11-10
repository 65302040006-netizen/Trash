/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, getDocs, collection, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { TrashLocation, Reward, Mission, AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  generalMin: 5,
  generalPerPiece: 1,
  recycleMin: 15,
  recyclePerPiece: 2,
  certificateTarget: 100,
  dailySubmitLimit: 3,
  maxPiecesPerSubmit: 50,
  announcement: 'ยินดีต้อนรับสู่ Trash Point! กิจกรรมสะสมคะแนนจากการเก็บและคัดแยกขยะเพื่อโรงเรียนของเรา',
};

export const DEFAULT_LOCATIONS: Omit<TrashLocation, 'id'>[] = [
  {
    name: 'หน้าอาคารเรียน 3',
    qrCode: 'TRASH_LOC_BUILDING3',
    description: 'จุดทิ้งและคัดแยกขยะ ชั้น 1 หน้าอาคาร 3',
    active: true,
  },
  {
    name: 'โรงอาหารกลาง',
    qrCode: 'TRASH_LOC_CANTEEN',
    description: 'จุดคัดแยกขยะข้างจุดคืนถาดอาหาร',
    active: true,
  },
  {
    name: 'สนามฟุตบอลและอัฒจันทร์',
    qrCode: 'TRASH_LOC_STADIUM',
    description: 'ถังขยะแยกประเภทข้างอัฒจันทร์ฝั่งทิศเหนือ',
    active: true,
  },
  {
    name: 'สวนหย่อมหน้าเสาธง',
    qrCode: 'TRASH_LOC_FLAGPOLE',
    description: 'จุดรวบรวมขยะรีไซเคิลบริเวณลานหน้าเสาธง',
    active: true,
  },
  {
    name: 'หน้าอาคารห้องสมุด',
    qrCode: 'TRASH_LOC_LIBRARY',
    description: 'จุดวางถังขยะกระดาษและขวดพลาสติกหน้าห้องสมุด',
    active: true,
  },
];

export const DEFAULT_REWARDS: Omit<Reward, 'id'>[] = [
  {
    name: 'สมุดบันทึกรักษ์โลก Eco Note',
    category: 'เครื่องเขียน',
    icon: 'notebook',
    cost: 20,
    stock: 35,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'ชุดปากกาหมึกเจลรีไซเคิล (3 ด้าม)',
    category: 'เครื่องเขียน',
    icon: 'pen',
    cost: 15,
    stock: 50,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'พวงกุญแจถังขยะยิ้ม Trashy ลิมิเต็ด',
    category: 'ของที่ระลึก',
    icon: 'keychain',
    cost: 35,
    stock: 25,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'กระเป๋าผ้าแคนวาสลดโลกร้อน Green Bag',
    category: 'ของที่ระลึก',
    icon: 'bag',
    cost: 60,
    stock: 15,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'ดินสอกดรักษ์โลก + ไส้ 2B',
    category: 'เครื่องเขียน',
    icon: 'pencil',
    cost: 25,
    stock: 40,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'คูปองโรงอาหารมูลค่า 20 บาท',
    category: 'ขนม/อาหาร',
    icon: 'snack',
    cost: 20,
    stock: 50,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'นมกล่อง UHT สดชื่นเสริมพลัง',
    category: 'ขนม/อาหาร',
    icon: 'milk',
    cost: 12,
    stock: 60,
    month: 'กุมภาพันธ์',
    active: true,
  },
  {
    name: 'ตุ๊กตามินิมาสคอต Trash Point นุ่มฟู',
    category: 'ของเล่น/ของสะสม',
    icon: 'toy',
    cost: 90,
    stock: 10,
    month: 'กุมภาพันธ์',
    active: true,
  },
];

export const DEFAULT_MISSIONS: Omit<Mission, 'id'>[] = [
  {
    title: 'เก็บขยะทั่วไป 10 ชิ้น',
    description: 'ทำความสะอาดบริเวณโรงเรียนด้วยการเก็บขยะทั่วไป',
    targetType: 'general',
    targetCount: 10,
    bonusPoints: 2,
    active: true,
  },
  {
    title: 'คัดแยกขวดพลาสติก/รีไซเคิล 15 ชิ้น',
    description: 'ช่วยลดขยะพลาสติก นำขวดเข้าสู่ระบบรีไซเคิล',
    targetType: 'recycle',
    targetCount: 15,
    bonusPoints: 3,
    active: true,
  },
  {
    title: 'พิทักษ์สนามบอลและอัฒจันทร์',
    description: 'ส่งขยะที่พบในบริเวณสนามกีฬาหรืออัฒจันทร์',
    targetType: 'any',
    targetCount: 5,
    bonusPoints: 5,
    active: true,
  },
  {
    title: 'ชวนเพื่อนร่วมภารกิจสีเขียว (ส่ง 2 ครั้งวันนี้)',
    description: 'มีส่วนร่วมทำความสะอาดโรงเรียนต่อเนื่อง 2 ครั้ง',
    targetType: 'share',
    targetCount: 2,
    bonusPoints: 3,
    active: true,
  },
];

export async function initializeSeedData(): Promise<void> {
  try {
    // 1. Settings
    const settingsDoc = await getDoc(doc(db, 'settings', 'app_config'));
    if (!settingsDoc.exists()) {
      await setDoc(doc(db, 'settings', 'app_config'), DEFAULT_SETTINGS);
      console.log('Seed: Settings initialized');
    }

    // 2. Locations
    const locSnap = await getDocs(collection(db, 'locations'));
    if (locSnap.empty) {
      const batch = writeBatch(db);
      DEFAULT_LOCATIONS.forEach((loc, index) => {
        const id = `loc_${index + 1}`;
        batch.set(doc(db, 'locations', id), {
          ...loc,
          id,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      console.log('Seed: Locations initialized');
    }

    // 3. Rewards
    const rewSnap = await getDocs(collection(db, 'rewards'));
    if (rewSnap.empty) {
      const batch = writeBatch(db);
      DEFAULT_REWARDS.forEach((rew, index) => {
        const id = `rew_${index + 1}`;
        batch.set(doc(db, 'rewards', id), {
          ...rew,
          id,
        });
      });
      await batch.commit();
      console.log('Seed: Rewards initialized');
    }

    // 4. Missions
    const misSnap = await getDocs(collection(db, 'missions'));
    if (misSnap.empty) {
      const batch = writeBatch(db);
      DEFAULT_MISSIONS.forEach((mis, index) => {
        const id = `mis_${index + 1}`;
        batch.set(doc(db, 'missions', id), {
          ...mis,
          id,
        });
      });
      await batch.commit();
      console.log('Seed: Missions initialized');
    }

    // 5. Sample Students for vibrant leaderboard & school stats
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      const batch = writeBatch(db);
      const sampleStudents = [
        {
          uid: 'student_1',
          name: 'กิตติศักดิ์ พิทักษ์โลก',
          className: 'ม.6/1',
          number: '4',
          studentId: '54801',
          avatar: 'avatar_1',
          role: 'student',
          totalEarned: 180,
          balance: 80,
          totalPieces: 95,
          certificateEarned: true,
          createdAt: new Date().toISOString(),
        },
        {
          uid: 'student_2',
          name: 'ปิยะดา รักษ์สิ่งแวดล้อม',
          className: 'ม.5/3',
          number: '12',
          studentId: '55312',
          avatar: 'avatar_2',
          role: 'student',
          totalEarned: 145,
          balance: 55,
          totalPieces: 72,
          certificateEarned: true,
          createdAt: new Date().toISOString(),
        },
        {
          uid: 'student_3',
          name: 'ธนากร สะอาดดี',
          className: 'ม.6/2',
          number: '8',
          studentId: '54808',
          avatar: 'avatar_3',
          role: 'student',
          totalEarned: 110,
          balance: 30,
          totalPieces: 58,
          certificateEarned: true,
          createdAt: new Date().toISOString(),
        },
        {
          uid: 'student_4',
          name: 'ณิชาภา เขียวสดใส',
          className: 'ม.4/2',
          number: '21',
          studentId: '56221',
          avatar: 'avatar_5',
          role: 'student',
          totalEarned: 85,
          balance: 40,
          totalPieces: 45,
          certificateEarned: false,
          createdAt: new Date().toISOString(),
        },
      ];

      sampleStudents.forEach((student) => {
        batch.set(doc(db, 'users', student.uid), student);
      });
      await batch.commit();
      console.log('Seed: Sample students initialized');
    }

    // 6. Sample Submissions for Reviewer queue testing
    const subSnap = await getDocs(collection(db, 'submissions'));
    if (subSnap.empty) {
      const batch = writeBatch(db);
      const sampleSubmissions = [
        {
          id: 'sub_sample_1',
          userId: 'student_2',
          userName: 'ปิยะดา รักษ์สิ่งแวดล้อม',
          className: 'ม.5/3',
          type: 'recycle',
          isRecycle: true,
          pieces: 18,
          locationId: 'loc_2',
          locationName: 'โรงอาหารกลาง',
          beforePhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="background:%2365A30D"><rect y="250" width="400" height="150" fill="%23CBD5E1"/><rect x="100" y="270" width="40" height="20" fill="%2338BDF8"/><text x="30" y="50" font-size="20" fill="white" font-weight="bold">ก่อนเก็บ: ขวดพลาสติกในโรงอาหาร</text></svg>',
          afterPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="background:%2316A34A"><rect y="250" width="400" height="150" fill="%23CBD5E1"/><rect x="150" y="160" width="80" height="130" fill="%23047857"/><text x="30" y="50" font-size="20" fill="white" font-weight="bold">หลังเก็บ: สะอาดเรียบร้อย</text></svg>',
          imageHash: 'sample_hash_1',
          properlyDisposed: true,
          status: 'pending',
          points: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sub_sample_2',
          userId: 'student_4',
          userName: 'ณิชาภา เขียวสดใส',
          className: 'ม.4/2',
          type: 'general',
          isRecycle: false,
          pieces: 8,
          locationId: 'loc_3',
          locationName: 'สนามฟุตบอลและอัฒจันทร์',
          beforePhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="background:%2384CC16"><rect y="250" width="400" height="150" fill="%23CBD5E1"/><rect x="180" y="280" width="30" height="30" fill="%23F43F5E"/><text x="30" y="50" font-size="20" fill="white" font-weight="bold">ก่อนเก็บ: เศษถุงขนมข้างสนาม</text></svg>',
          afterPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" style="background:%2322C55E"><rect y="250" width="400" height="150" fill="%23CBD5E1"/><rect x="150" y="160" width="80" height="130" fill="%23047857"/><text x="30" y="50" font-size="20" fill="white" font-weight="bold">หลังเก็บ: ทิ้งลงถังแล้ว</text></svg>',
          imageHash: 'sample_hash_2',
          properlyDisposed: true,
          status: 'pending',
          points: 0,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ];

      sampleSubmissions.forEach((sub) => {
        batch.set(doc(db, 'submissions', sub.id), sub);
      });
      await batch.commit();
      console.log('Seed: Pending submissions initialized');
    }

    // 7. Sample Redemptions for Reviewer gift dispatch testing
    const redSnap = await getDocs(collection(db, 'redemptions'));
    if (redSnap.empty) {
      await setDoc(doc(db, 'redemptions', 'red_sample_1'), {
        id: 'red_sample_1',
        userId: 'student_3',
        userName: 'ธนากร สะอาดดี',
        className: 'ม.6/2',
        rewardId: 'rew_1',
        rewardName: 'สมุดบันทึกรักษ์โลก Eco Note',
        cost: 20,
        code: 'TP-7291',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      console.log('Seed: Sample redemption initialized');
    }
  } catch (err) {
    console.error('Seed initialization notice:', err);
  }
}
