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
  Upload,
  RefreshCw,
  QrCode as QrIcon,
} from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TrashLocation } from '../types';
import { DEFAULT_LOCATIONS } from '../firebase/seed';

interface ScanQRScreenProps {
  onScanSuccess: (location: TrashLocation) => void;
  onCancel: () => void;
}

export const ScanQRScreen: React.FC<ScanQRScreenProps> = ({
  onScanSuccess,
  onCancel,
}) => {
  // Pre-load default school locations so scanner always has match targets
  const initialLocations: TrashLocation[] = DEFAULT_LOCATIONS.map((loc, idx) => ({
    id: `loc_${idx + 1}`,
    ...loc,
  }));

  const [locations, setLocations] = useState<TrashLocation[]>(initialLocations);
  const locationsRef = useRef<TrashLocation[]>(initialLocations);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep locationsRef updated for closure in scanner callback
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  // Fetch updated school locations from Firestore
  useEffect(() => {
    async function fetchLocations() {
      try {
        setLoadingLocations(true);
        const q = query(collection(db, 'locations'), where('active', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: TrashLocation[] = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as Omit<TrashLocation, 'id'>) });
          });
          setLocations(list);
          locationsRef.current = list;
        }
      } catch (err) {
        console.warn('Locations query notice:', err);
      } finally {
        setLoadingLocations(false);
      }
    }
    fetchLocations();
  }, []);

  // Handle QR code decoding
  const handleQrCodeMatch = (rawCode: string) => {
    if (!rawCode) return;
    const clean = rawCode.trim();
    const currentLocs = locationsRef.current;

    // Try matching location
    const matched = currentLocs.find((loc) => {
      const locQr = loc.qrCode.trim().toLowerCase();
      const codeLower = clean.toLowerCase();
      return (
        locQr === codeLower ||
        loc.id.toLowerCase() === codeLower ||
        codeLower.includes(locQr) ||
        locQr.includes(codeLower) ||
        loc.name.toLowerCase().includes(codeLower)
      );
    });

    if (matched) {
      cleanupScanner();
      onScanSuccess(matched);
    } else {
      // If code doesn't match predefined list, match first or alert
      setCameraError(`สแกนพบโค้ด "${clean}" แต่ไม่ตรงกับป้ายจุดทิ้งขยะในระบบ กรุณาเลือกจุดทิ้งขยะด้านล่าง`);
      setShowManualSelect(true);
    }
  };

  const cleanupScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(() => {});
        } else {
          html5QrCodeRef.current.clear();
        }
      } catch (e) {
        // ignore
      }
    }
  };

  // Start Scanner function
  const startCamera = async (targetCamId?: string) => {
    const qrRegionId = 'qr-reader-viewport';
    cleanupScanner();
    setCameraError('');

    try {
      const qrScanner = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = qrScanner;

      // Get camera list
      let deviceConfig: unknown = { facingMode: 'environment' };
      try {
        const devs = await Html5Qrcode.getCameras();
        if (devs && devs.length > 0) {
          setCameras(devs);
          if (targetCamId) {
            deviceConfig = targetCamId;
          } else {
            // Find rear camera
            const backCam = devs.find((d) =>
              /back|rear|environment|หลัง/i.test(d.label)
            );
            const chosen = backCam ? backCam.id : devs[0].id;
            setSelectedCameraId(chosen);
            deviceConfig = chosen;
          }
        }
      } catch (e) {
        // Fallback to facingMode
        deviceConfig = { facingMode: 'environment' };
      }

      await qrScanner.start(
        deviceConfig as string | MediaTrackConstraints,
        {
          fps: 10,
          qrbox: (w, h) => {
            const edge = Math.floor(Math.min(w, h) * 0.7);
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrCodeMatch(decodedText);
        },
        () => {
          // scanning frame
        }
      );

      setIsScanning(true);

      // Check torch
      try {
        const caps = qrScanner.getRunningTrackCapabilities();
        if (caps && 'torch' in caps) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      // Try fallback to user camera if environment failed
      try {
        const qrScanner = html5QrCodeRef.current || new Html5Qrcode(qrRegionId);
        await qrScanner.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => handleQrCodeMatch(text),
          () => {}
        );
        setIsScanning(true);
        return;
      } catch (fallbackErr) {
        setIsScanning(false);
        const errStr = String(err);
        if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
          setCameraError('ไม่ได้รับอนุญาตให้เข้าถึงกล้อง กรุณาเปิดสิทธิ์ในเบราว์เซอร์ หรือกดเลือกสถานที่เองด้านล่าง');
        } else {
          setCameraError('ไม่สามารถเปิดสตรีมกล้องได้ กรุณาใช้ปุ่ม "เลือกภาพ QR จากเครื่อง" หรือเลือกสถานที่เอง');
        }
        setShowManualSelect(true);
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      cleanupScanner();
    };
  }, []);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startCamera(nextCamera.id);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch error:', e);
    }
  };

  // Scan QR from image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCameraError('');
      const scanner = html5QrCodeRef.current || new Html5Qrcode('qr-reader-viewport');
      const decodedText = await scanner.scanFile(file, true);
      handleQrCodeMatch(decodedText);
    } catch (err) {
      setCameraError('ไม่พบ QR Code ในรูปภาพที่เลือก กรุณาเลือกสถานที่ด้านล่าง');
      setShowManualSelect(true);
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
            สแกนจุดส่งขยะ
          </h2>
          <p className="text-xs text-slate-500">สแกน QR Code ประจำจุดทิ้งเพื่อเริ่มบันทึก</p>
        </div>
      </div>

      {/* Hidden File Input for QR Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Camera Viewport Box */}
      <div className="relative bg-slate-950 rounded-3xl overflow-hidden aspect-square max-w-[320px] mx-auto shadow-xl border-4 border-emerald-500/60 flex items-center justify-center">
        {/* html5-qrcode DOM Target */}
        <div id="qr-reader-viewport" className="w-full h-full object-cover" />

        {/* Framing Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-2xl relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2" />
          </div>
        </div>

        {/* Action Controls on Camera */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2.5 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition"
              title="สลับกล้องหน้า/หลัง"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition ${
                torchOn ? 'bg-amber-400 text-slate-900' : 'bg-black/60 text-white'
              }`}
              title="เปิดไฟฉาย"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Helpful Mascot Tip */}
      <div className="flex items-center justify-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200/80 max-w-[320px] mx-auto">
        <Mascot mood="scanning" size="sm" className="w-9 h-9 flex-shrink-0" />
        <span className="leading-tight text-left">
          นำกล้องส่องที่ป้าย QR Code บริเวณจุดทิ้งขยะ หรือกดเลือกรูปภาพ QR จากเครื่อง
        </span>
      </div>

      {/* Error Notice */}
      {cameraError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs text-left flex items-start gap-2 max-w-[320px] mx-auto">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">แจ้งเตือนการสแกน</p>
            <p className="leading-relaxed">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="max-w-[320px] mx-auto space-y-2">
        {/* Upload QR Image from Device */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-4 rounded-2xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition active:scale-98 shadow-2xs"
        >
          <Upload className="w-4 h-4 text-emerald-600" />
          <span>เลือกรูปภาพ QR จากแกลเลอรี / ถ่ายรูป</span>
        </button>

        {/* Manual Select Location Toggle */}
        <button
          type="button"
          onClick={() => setShowManualSelect(!showManualSelect)}
          className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition active:scale-98 shadow-sm"
        >
          <MapPin className="w-4 h-4 text-amber-300" />
          <span>{showManualSelect ? 'ซ่อนรายการสถานที่' : '📍 เลือกจุดทิ้งขยะเอง (กรณีสแกนไม่ได้)'}</span>
        </button>

        {/* Location Selection Drawer */}
        {showManualSelect && (
          <div className="bg-white rounded-2xl p-3 border border-emerald-200 text-left space-y-2 shadow-sm animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>เลือกจุดที่คุณทิ้งขยะอยู่ในขณะนี้:</span>
            </h4>

            {locations.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">ไม่พบสถานที่ในระบบ</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      cleanupScanner();
                      onScanSuccess(loc);
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-400 text-left transition flex items-center justify-between group active:scale-98"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 block">
                        {loc.name}
                      </span>
                      {loc.description && (
                        <span className="text-[10px] text-slate-500 block">
                          {loc.description}
                        </span>
                      )}
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
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
