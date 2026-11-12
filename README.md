# 🌿 Trash Point - ระบบสะสมคะแนนขยะเพื่อโรงเรียนสีเขียว

> **สโลแกน:** "เก็บขยะ = ทำความดี | สะสมคะแนน = แลกรางวัล | รักษ์โลก = เริ่มที่เรา"

เว็บแอปพลิเคชันรูปแบบ **Mobile-First Progressive Web App (PWA)** สำหรับโรงเรียน เปลี่ยนการเก็บและคัดแยกขยะจาก "หน้าที่" ให้กลายเป็นกิจกรรมที่นักเรียนทุกคนอยากมีส่วนร่วม ผ่านระบบสะสมแต้ม แลกของรางวัล และรับเกียรติบัตรเชิดชูเกียรติ

---

## ✨ ฟีเจอร์หลัก (Key Features)

### 🧑‍🎓 สำหรับนักเรียน (Student)
- **สแกน QR Code ประจำจุดทิ้งขยะ:** เปิดกล้องสแกนป้าย ณ จุดทิ้งขยะรอบโรงเรียน หรือเลือกสถานที่เอง
- **ส่งหลักฐานรูปถ่าย (Before & After):** ถ่ายภาพก่อนและหลังเก็บ พร้อมระบบบีบอัดภาพอัตโนมัติฝั่งเบราว์เซอร์ (< 200KB) เพื่อประหยัดพื้นที่
- **ระบบคำนวณคะแนนตามกติกา:**
  - ขยะทั่วไป: ส่งขั้นต่ำ 5 ชิ้น ได้ชิ้นละ 1 คะแนน
  - ขยะรีไซเคิล/ขวดพลาสติก/กระดาษ: ส่งขั้นต่ำ 15 ชิ้น ได้ชิ้นละ 2 คะแนน
- **ภารกิจประจำวัน (Daily Missions):** ทำภารกิจเก็บขยะตามเป้าหมายเพื่อรับโบนัสคะแนนพิเศษ
- **ร้านค้าแลกของรางวัล (Rewards Shop):** นำคะแนนคงเหลือมาแลกขนม, เครื่องเขียน, และของที่ระลึก พร้อมออกรหัส QR Code สำหรับรับของ
- **เกียรติบัตรนักอนุรักษ์สิ่งแวดล้อมดีเด่น:** สะสมครบ 100 คะแนน รับเกียรติบัตรอย่างเป็นทางการพร้อมปุ่มพิมพ์/บันทึก PDF
- **กระดานผู้นำ (Leaderboard):** โพเดียม Top 3 และจัดอันดับตามระดับชั้นเรียน (ม.1 - ม.6)

### 🔍 สำหรับผู้ตรวจสอบ (Reviewer - ครู / สภานักเรียน)
- **คิวรอตรวจ (Approval Queue):** ตรวจสอบภาพเปรียบเทียบก่อน-หลังขยายซูมได้
- **อนุมัติ & ปรับแก้จำนวนชิ้น:** ให้คะแนนและส่งการแจ้งเตือนถึงนักเรียนแบบ Realtime
- **ปฏิเสธพร้อมระบุเหตุผล:** แจ้งเตือนข้อผิดพลาดให้นักเรียนทราบ
- **ระบบส่งมอบรางวัล (Reward Fulfillment):** ค้นหารหัสหรือสแกน QR ของนักเรียนเพื่อยืนยันการส่งมอบ

### 🛡️ สำหรับผู้ดูแลระบบ (Admin)
- **แดชบอร์ดสถิติรวมของโรงเรียน:** จำนวนนักเรียน, ขยะที่เก็บได้ทั้งหมด, สถิติคอยตรวจ
- **จัดการจุดทิ้งขยะ & สร้าง QR Code:** เพิ่ม/ลบสถานที่ พร้อมปุ่มพิมพ์ป้าย QR Code ไปติดตามจุดต่างๆ
- **ปรับแต่งกติกาคะแนน:** แก้ไขขั้นต่ำและเกณฑ์คะแนนได้โดยตรงผ่าน UI โดยไม่ต้องแก้โค้ด
- **จัดการของรางวัลและสต็อกสินค้า:** เพิ่ม ลบ และอัปเดตจำนวนสต็อก
- **ส่งออกรายงานสรุป (CSV Export):** ดาวน์โหลดรายชื่อและประวัติคะแนนของนักเรียนทั้งหมด

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion
- **PWA Support:** `vite-plugin-pwa` (Service Worker, Web App Manifest, Offline indicator, In-app install)
- **QR Code Scanning & Generation:** `html5-qrcode`, `qrcode`
- **Backend & Database:** Firebase Authentication (Google Sign-In), Cloud Firestore
- **Security:** Hardened Firestore Security Rules (RBAC, Rate Limiting, Atomic Transactions)
- **Assets & Icons:** Lucide React, Canvas Confetti

---

## 🚀 วิธีติดตั้งและรันในเครื่อง (Getting Started)

### 1. โคลนคลังโค้ด (Clone Repository)
```bash
git clone https://github.com/USERNAME/trash-point.git
cd trash-point
```

### 2. ติดตั้งแพ็กเกจ (Install Dependencies)
```bash
npm install
```

### 3. ตั้งค่า Firebase
ตั้งค่าไฟล์ `firebase-applet-config.json` ให้ตรงกับโปรเจกต์ Firebase ของคุณ หรือคัดลอกจาก `firebase-applet-config.example.json`:
```json
{
  "projectId": "YOUR_PROJECT_ID",
  "appId": "YOUR_APP_ID",
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "firestoreDatabaseId": "YOUR_DATABASE_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID"
}
```

### 4. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ที่ `http://localhost:3000`

### 5. บิลด์สำหรับ Production
```bash
npm run build
```

---

## 📄 ใบอนุญาต (License)
โครงการนี้เผยแพร่ภายใต้สัญญาอนุญาต [Apache License 2.0](LICENSE)
