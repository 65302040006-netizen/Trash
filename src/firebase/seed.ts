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
  } catch (err) {
    console.error('Seed initialization notice:', err);
  }
}
