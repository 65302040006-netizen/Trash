/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Trash2,
  CheckCircle,
  AlertCircle,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TrashLocation, TrashType, Submission } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { Mascot } from '../components/Mascot';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { getBangkokTodayString } from '../utils/dateFormatter';
import confetti from 'canvas-confetti';

interface SubmitScreenProps {
  initialLocation?: TrashLocation | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SubmitScreen: React.FC<SubmitScreenProps> = ({
  initialLocation,
  onSuccess,
  onCancel,
}) => {
  const { profile, settings } = useAuth();

  // Form State
  const [selectedType, setSelectedType] = useState<TrashType>('general');
  const [pieces, setPieces] = useState<number>(5);
  const [selectedLocation, setSelectedLocation] = useState<TrashLocation | null>(
    initialLocation || null
  );
  const [allLocations, setAllLocations] = useState<TrashLocation[]>([]);

  // Photos
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [beforeHash, setBeforeHash] = useState<string>('');
  const [afterHash, setAfterHash] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState<'before' | 'after' | null>(null);

  // Checkbox
  const [properlyDisposed, setProperlyDisposed] = useState<boolean>(false);

  // Status & Validation
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // File Inputs
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Fetch locations if not provided
  useEffect(() => {
    async function loadLocations() {
      try {
        const q = query(collection(db, 'locations'), where('active', '==', true));
        const snap = await getDocs(q);
        const list: TrashLocation[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<TrashLocation, 'id'>) });
        });
        setAllLocations(list);
        if (!selectedLocation && list.length > 0) {
          setSelectedLocation(list[0]);
        }
      } catch (e) {
        console.warn('Locations load error:', e);
      }
    }
    loadLocations();
  }, []);

  // Determine scoring rules for selected type
  const isRecycleType = selectedType === 'recycle' || selectedType === 'paper';
  const minPieces = isRecycleType
    ? settings.recycleMin || 15
    : settings.generalMin || 5;
  const ptsPerPiece = isRecycleType
    ? settings.recyclePerPiece || 2
    : settings.generalPerPiece || 1;
  const maxPieces = settings.maxPiecesPerSubmit || 50;

  // Potential points calculation preview
  const isMinimumMet = pieces >= minPieces;
  const piecesNeeded = Math.max(0, minPieces - pieces);
  const estimatedPoints = isMinimumMet ? pieces * ptsPerPiece : 0;

  // Handle Image Upload & Compression
  const handlePhotoCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'before' | 'after'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setPhotoLoading(target);

    try {
      const result = await compressImage(file);
      if (target === 'before') {
        setBeforePhoto(result.dataUrl);
        setBeforeHash(result.hash);
      } else {
        setAfterPhoto(result.dataUrl);
        setAfterHash(result.hash);
      }
    } catch (err) {
      setErrorMsg('การบีบอัดภาพไม่สำเร็จ กรุณาลองถ่ายใหม่อีกครั้ง');
    } finally {
      setPhotoLoading(null);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profile) {
      setErrorMsg('กรุณาเข้าสู่ระบบก่อนส่งข้อมูล');
      return;
    }

    if (!selectedLocation) {
      setErrorMsg('กรุณาระบุสถานที่เก็บขยะ');
      return;
    }

    if (!beforePhoto || !afterPhoto) {
      setErrorMsg('กรุณาแนบภาพถ่ายทั้ง "ก่อน" และ "หลัง" การเก็บขยะให้ครบถ้วน');
      return;
    }

    if (beforeHash && afterHash && beforeHash === afterHash) {
      setErrorMsg('ภาพก่อนและหลังต้องไม่ใช่รูปเดียวกัน กรุณาถ่ายภาพตามจริง');
      return;
    }

    if (!isMinimumMet) {
      setErrorMsg(`ประเภทนี้ต้องส่งขั้นต่ำอย่างน้อย ${minPieces} ชิ้น (ยังขาดอีก ${piecesNeeded} ชิ้น)`);
      return;
    }

    if (pieces > maxPieces) {
      setErrorMsg(`สามารถส่งได้สูงสุดไม่เกินครั้งละ ${maxPieces} ชิ้น`);
      return;
    }

    if (!properlyDisposed) {
      setErrorMsg('กรุณายืนยันว่าได้ทิ้งหรือคัดแยกขยะอย่างถูกวิธีแล้ว');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Anti-Cheat: Check daily submission limit
      const todayKey = getBangkokTodayString();
      const dailyQuery = query(
        collection(db, 'submissions'),
        where('userId', '==', profile.uid)
      );
      const subSnap = await getDocs(dailyQuery);
      let todayCount = 0;
      subSnap.forEach((doc) => {
        const item = doc.data() as Submission;
        if (item.createdAt && item.createdAt.startsWith(todayKey)) {
          todayCount++;
        }
      });

      const dailyLimit = settings.dailySubmitLimit || 3;
      if (todayCount >= dailyLimit) {
        setErrorMsg(`คุณส่งหลักฐานครบโควตา ${dailyLimit} ครั้งของวันนี้แล้ว กรุณาร่วมกิจกรรมต่อในวันพรุ่งนี้`);
        setSubmitting(false);
        return;
      }

      // 2. Anti-Cheat: Check duplicate image submission hash
      let isDuplicate = false;
      subSnap.forEach((doc) => {
        const item = doc.data() as Submission;
        if (
          item.imageHash &&
          (item.imageHash === beforeHash || item.imageHash === afterHash)
        ) {
          isDuplicate = true;
        }
      });

      if (isDuplicate) {
        setErrorMsg('พบว่ารูปถ่ายนี้เคยถูกส่งในระบบแล้ว กรุณาถ่ายภาพใหม่จากสถานที่จริง');
        setSubmitting(false);
        return;
      }

      // 3. Create Submission document in Firestore
      const newSubmission: Omit<Submission, 'id'> = {
        userId: profile.uid,
        userName: profile.name,
        className: profile.className,
        type: selectedType,
        isRecycle: isRecycleType,
        pieces: Number(pieces),
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        beforePhoto,
        afterPhoto,
        imageHash: beforeHash || afterHash,
        properlyDisposed,
        status: 'pending',
        points: 0, // Points are 0 until approved by reviewer/admin
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'submissions'), newSubmission);

      // Trigger happy confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#2E9E4F', '#FFC93C', '#10B981'],
      });

      setShowSuccessModal(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
      setErrorMsg('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const trashTypes = [
    {
      id: 'general' as TrashType,
      name: 'ขยะทั่วไป',
      desc: 'เศษถุง, ซองขนม, กล่องโฟม',
      icon: '🗑️',
      min: settings.generalMin || 5,
      pts: settings.generalPerPiece || 1,
    },
    {
      id: 'recycle' as TrashType,
      name: 'ขวดพลาสติก / กระป๋อง',
      desc: 'ขวดน้ำดื่ม, กระป๋องอลูมิเนียม',
      icon: '🍾',
      min: settings.recycleMin || 15,
      pts: settings.recyclePerPiece || 2,
    },
    {
      id: 'paper' as TrashType,
      name: 'กระดาษ / ลังกระดาษ',
      desc: 'กระดาษ A4, กล่องพัสดุ, ใบปลิว',
      icon: '📦',
      min: settings.recycleMin || 15,
      pts: settings.recyclePerPiece || 2,
    },
    {
      id: 'other' as TrashType,
      name: 'ขยะอื่นๆ',
      desc: 'ขยะชิ้นใหญ่, ยาง, วัสดุอื่นๆ',
      icon: '♻️',
      min: settings.generalMin || 5,
      pts: settings.generalPerPiece || 1,
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 pr-9">
          <h2 className="text-lg font-bold font-mali text-slate-900">
            ส่งหลักฐานการเก็บขยะ
          </h2>
          <p className="text-xs text-slate-500">กรอกข้อมูลและแนบภาพถ่ายเพื่อรับคะแนน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Location Badge */}
        <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 font-semibold block">
                จุดทิ้งขยะที่ระบุ:
              </span>
              <span className="text-xs font-bold text-slate-800">
                {selectedLocation?.name || 'ยังไม่ได้เลือกสถานที่'}
              </span>
            </div>
          </div>

          {allLocations.length > 1 && (
            <select
              value={selectedLocation?.id || ''}
              onChange={(e) => {
                const loc = allLocations.find((l) => l.id === e.target.value);
                if (loc) setSelectedLocation(loc);
              }}
              className="text-xs bg-white border border-emerald-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
            >
              {allLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2: Select Trash Type */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <label className="block text-xs font-bold text-slate-800 mb-2">
            1. เลือกประเภทขยะที่เก็บ:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {trashTypes.map((item) => {
              const isSelected = selectedType === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSelectedType(item.id);
                    // Automatically adjust piece counter to recommended minimum if currently below
                    if (pieces < item.min) setPieces(item.min);
                  }}
                  className={`p-3 rounded-2xl text-left border transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl">{item.icon}</span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md mt-1">
                      ขั้นต่ำ {item.min} ชิ้น ({item.pts} แต้ม/ชิ้น)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Quantity Counter */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <label className="block text-xs font-bold text-slate-800 mb-2">
            2. จำนวนขยะโดยประมาณ (ชิ้น):
          </label>
          <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPieces(Math.max(1, pieces - 1))}
              className="w-11 h-11 rounded-xl bg-white text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center">
              <input
                type="number"
                min="1"
                max={maxPieces}
                value={pieces}
                onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center text-2xl font-bold font-mali bg-transparent text-slate-900 focus:outline-none"
              />
              <span className="block text-[10px] text-slate-500">ชิ้น</span>
            </div>

            <button
              type="button"
              onClick={() => setPieces(Math.min(maxPieces, pieces + 1))}
              className="w-11 h-11 rounded-xl bg-white text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-100 active:scale-95 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Piece validation info */}
          <div className="mt-2 flex items-center justify-between text-xs">
            {!isMinimumMet ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                ขั้นต่ำ {minPieces} ชิ้น (ขาดอีก {piecesNeeded} ชิ้น)
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                ครบเกณฑ์ขั้นต่ำแล้ว
              </span>
            )}
            <span className="text-slate-400 text-[11px]">สูงสุด {maxPieces} ชิ้น/ครั้ง</span>
          </div>
        </div>

        {/* Step 4: Before & After Photos (Required) */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              3. ภาพถ่ายหลักฐาน (บังคับครบ 2 ภาพ):
            </label>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              บีบอัดอัตโนมัติ
            </span>
          </div>

          {/* Privacy guidance */}
          <p className="text-[10px] text-slate-500 leading-tight bg-slate-50 p-2 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
            <ShieldAlert className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>คำเตือน: กรุณาไม่ถ่ายให้เห็นใบหน้าเพื่อนหรือบุคคลอื่น เพื่อความเป็นส่วนตัว</span>
          </p>

          {/* Photo Boxes */}
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Before Photo Box */}
            <div className="text-center">
              <span className="block text-[11px] font-bold text-slate-700 mb-1">
                1. ก่อนเก็บ (Before) *
              </span>
              <div
                onClick={() => beforeInputRef.current?.click()}
                className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition overflow-hidden ${
                  beforePhoto
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {photoLoading === 'before' ? (
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                    <span className="text-[10px] text-slate-500 mt-1 block">บีบอัดภาพ...</span>
                  </div>
                ) : beforePhoto ? (
                  <>
                    <img
                      src={beforePhoto}
                      alt="Before"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-[11px] text-white font-bold bg-black/60 px-2 py-1 rounded-md">
                        เปลี่ยนภาพ
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400">
                    <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    <span className="text-[10px] font-semibold block text-slate-600">ถ่ายรูปก่อนเก็บ</span>
                    <span className="text-[9px] text-slate-400">ขยะที่พบ</span>
                  </div>
                )}
              </div>
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoCapture(e, 'before')}
              />
              {beforePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setBeforePhoto('');
                    setBeforeHash('');
                  }}
                  className="mt-1 text-[10px] text-red-500 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <Trash2 className="w-3 h-3" /> ลบภาพ
                </button>
              )}
            </div>

            {/* After Photo Box */}
            <div className="text-center">
              <span className="block text-[11px] font-bold text-slate-700 mb-1">
                2. หลังเก็บ (After) *
              </span>
              <div
                onClick={() => afterInputRef.current?.click()}
                className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition overflow-hidden ${
                  afterPhoto
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {photoLoading === 'after' ? (
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                    <span className="text-[10px] text-slate-500 mt-1 block">บีบอัดภาพ...</span>
                  </div>
                ) : afterPhoto ? (
                  <>
                    <img
                      src={afterPhoto}
                      alt="After"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-[11px] text-white font-bold bg-black/60 px-2 py-1 rounded-md">
                        เปลี่ยนภาพ
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400">
                    <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    <span className="text-[10px] font-semibold block text-slate-600">ถ่ายรูปหลังเก็บ</span>
                    <span className="text-[9px] text-slate-400">พื้นที่สะอาด/ในถัง</span>
                  </div>
                )}
              </div>
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoCapture(e, 'after')}
              />
              {afterPhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setAfterPhoto('');
                    setAfterHash('');
                  }}
                  className="mt-1 text-[10px] text-red-500 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <Trash2 className="w-3 h-3" /> ลบภาพ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 5: Scoring Estimate Preview */}
        <div className="bg-gradient-to-r from-amber-50 to-emerald-50 p-3.5 rounded-2xl border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">
              ประมาณการคะแนนที่จะได้รับเมื่ออนุมัติ:
            </span>
            <span className="text-xs text-slate-700">
              {isMinimumMet
                ? `${pieces} ชิ้น × ${ptsPerPiece} คะแนน`
                : `ยังไม่ถึงเกณฑ์ขั้นต่ำ (${minPieces} ชิ้น)`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mali text-emerald-700">
              +{estimatedPoints}
            </span>
            <span className="text-[10px] text-slate-500 block">คะแนน</span>
          </div>
        </div>

        {/* Step 6: Confirmation Checkbox */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
          <input
            id="properDisposal"
            type="checkbox"
            checked={properlyDisposed}
            onChange={(e) => setProperlyDisposed(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-emerald-600 rounded-sm focus:ring-emerald-500"
          />
          <label htmlFor="properDisposal" className="text-xs text-slate-700 leading-snug cursor-pointer select-none">
            <strong>ยืนยันการปฏิบัติ:</strong> ฉันทิ้งหรือคัดแยกขยะอย่างถูกวิธีลงในถังขยะเรียบร้อยแล้ว
          </label>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !isMinimumMet || !beforePhoto || !afterPhoto || !properlyDisposed}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังส่งข้อมูลและอัปโหลด...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>ส่งข้อมูลเพื่อรอการตรวจสอบ</span>
            </>
          )}
        </button>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-20 h-20 mx-auto mb-2">
              <Mascot mood="excited" size="md" />
            </div>
            <h3 className="text-xl font-bold font-mali text-emerald-800">
              ส่งหลักฐานสำเร็จแล้ว!
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
              ข้อมูลของคุณถูกบันทึกเรียบร้อย
              <br />
              <strong className="text-amber-700">สถานะ: รอตรวจ (Pending)</strong>
              <br />
              รอครูหรือสภานักเรียนตรวจสอบหลักฐาน และคะแนนจะถูกเพิ่มให้อัตโนมัติเมื่ออนุมัติ
            </p>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                onSuccess();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              ดูประวัติการส่ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
