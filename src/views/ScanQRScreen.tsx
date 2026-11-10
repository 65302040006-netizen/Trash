/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Flashlight,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TrashLocation } from '../types';

interface ScanQRScreenProps {
  onScanSuccess: (location: TrashLocation) => void;
  onCancel: () => void;
}

export const ScanQRScreen: React.FC<ScanQRScreenProps> = ({
  onScanSuccess,
  onCancel,
}) => {
  const [locations, setLocations] = useState<TrashLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Fetch available school locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const q = query(collection(db, 'locations'), where('active', '==', true));
        const snap = await getDocs(q);
        const list: TrashLocation[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<TrashLocation, 'id'>) });
        });
        setLocations(list);
      } catch (err) {
        console.error('Fetch locations error:', err);
      } finally {
        setLoadingLocations(false);
      }
    }
    fetchLocations();
  }, []);

  // Initialize and start camera QR scanner
  useEffect(() => {
    const qrRegionId = 'qr-reader-viewport';
    let isMounted = true;

    async function startScanner() {
      try {
        setCameraError('');
        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success QR matched
            handleQrCodeMatch(decodedText);
          },
          () => {
            // Scan progress (frame skipped/no qr)
          }
        );

        if (isMounted) {
          setScannerActive(true);
          // Check torch capability
          try {
            const capabilities = html5QrCode.getRunningTrackCapabilities();
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(true);
            }
          } catch (e) {
            // Torch check not supported
          }
        }
      } catch (err: unknown) {
        console.warn('QR camera start notice:', err);
        if (isMounted) {
          setScannerActive(false);
          const errorMsg = String(err);
          if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
            setCameraError('ไม่ได้รับอนุญาตให้เข้าถึงกล้อง กรุณาเปิดสิทธิ์กล้องในเบราว์เซอร์ หรือกดปุ่ม "เลือกสถานที่เอง" ด้านล่าง');
          } else {
            setCameraError('ไม่สามารถเปิดกล้องได้ หรืออุปกรณ์ไม่รองรับ กรุณาใช้ปุ่ม "เลือกสถานที่เอง"');
          }
          setShowManualSelect(true);
        }
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              html5QrCodeRef.current?.clear();
            });
          } else {
            html5QrCodeRef.current.clear();
          }
        } catch (e) {
          console.warn('QR cleanup notice:', e);
        }
      }
    };
  }, [locations]);

  const handleQrCodeMatch = (code: string) => {
    // Find matching location by qrCode or id
    const found = locations.find(
      (loc) => loc.qrCode === code || loc.id === code || loc.name.includes(code)
    );

    if (found) {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      onScanSuccess(found);
    } else {
      // In case the QR code doesn't match a school trash point
      setCameraError(`QR Code '${code}' ไม่ตรงกับจุดทิ้งขยะในระบบ กรุณาสแกนป้ายของโรงเรียน หรือเลือกสถานที่เอง`);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  return (
    <div className="space-y-4 pb-8 text-center">
      {/* Header */}
      <div className="flex items-center justify-between text-left">
        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 pr-9">
          <h2 className="text-lg font-bold font-mali text-slate-900">
            สแกนเพื่อส่งคะแนน
          </h2>
          <p className="text-xs text-slate-500">กรุณาสแกน QR Code ที่จุดส่งขยะ</p>
        </div>
      </div>

      {/* Camera Box */}
      <div className="relative bg-slate-950 rounded-3xl overflow-hidden aspect-square max-w-[320px] mx-auto shadow-xl border-4 border-emerald-500/50 flex items-center justify-center">
        {/* html5-qrcode reader div */}
        <div id="qr-reader-viewport" className="w-full h-full object-cover" />

        {/* Framing Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-2xl relative">
            {/* 4 Green Corner Accents */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            {/* Animated Laser Scanning Line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2" />
          </div>
        </div>

        {/* Torch Button if supported */}
        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`absolute bottom-3 right-3 p-2.5 rounded-full z-20 backdrop-blur-md transition ${
              torchOn ? 'bg-amber-400 text-slate-900' : 'bg-black/50 text-white'
            }`}
          >
            <Flashlight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mascot Assistant Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-emerald-800 bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-200/60 max-w-[320px] mx-auto">
        <Mascot mood="scanning" size="sm" className="w-9 h-9 flex-shrink-0" />
        <span className="leading-tight text-left">
          หันกล้องไปที่ป้าย QR Code บริเวณจุดทิ้งขยะ หรือเลือกสถานที่เองด้านล่าง
        </span>
      </div>

      {/* Camera / QR Error Warning */}
      {cameraError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs text-left flex items-start gap-2 max-w-[320px] mx-auto">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">แจ้งเตือนการสแกน</p>
            <p className="leading-relaxed">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Fallback button: Choose location manually */}
      <div className="pt-2 max-w-[320px] mx-auto space-y-2">
        {/* Quick Test Chips for Instant Testing */}
        <div className="bg-slate-100/90 p-2.5 rounded-2xl border border-slate-200/80 text-left">
          <span className="text-[10px] font-bold text-slate-600 block mb-1.5">
            ⚡ หรือคลิกทดสอบสแกนจุดทิ้งขยะ (สำหรับอุปกรณ์ที่ไม่มีกล้อง):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleQrCodeMatch(loc.qrCode)}
                className="text-[10px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 transition active:scale-95 shadow-2xs"
              >
                📍 {loc.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowManualSelect(!showManualSelect)}
          className="w-full py-2.5 px-4 rounded-2xl bg-white border border-emerald-500 text-emerald-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 transition active:scale-98 shadow-sm"
        >
          <MapPin className="w-4 h-4" />
          <span>{showManualSelect ? 'ซ่อนรายการสถานที่' : 'เลือกสถานที่เอง (กรณีสแกนไม่ได้)'}</span>
        </button>

        {/* Location List Drawer / Expansion */}
        {showManualSelect && (
          <div className="bg-white rounded-2xl p-3 border border-slate-200 text-left space-y-2 shadow-sm animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>เลือกจุดทิ้งขยะที่คุณยืนอยู่:</span>
            </h4>

            {loadingLocations ? (
              <p className="text-xs text-slate-400 py-2">กำลังโหลดสถานที่...</p>
            ) : locations.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">ไม่พบสถานที่ในระบบ</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      if (html5QrCodeRef.current?.isScanning) {
                        html5QrCodeRef.current.stop().catch(() => {});
                      }
                      onScanSuccess(loc);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 text-left transition flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-800 group-hover:text-emerald-700 block">
                        {loc.name}
                      </span>
                      {loc.description && (
                        <span className="text-[10px] text-slate-500 block">
                          {loc.description}
                        </span>
                      )}
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
