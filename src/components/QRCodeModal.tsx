/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, QrCode as QrIcon } from 'lucide-react';

interface QRCodeModalProps {
  title: string;
  subtitle?: string;
  codeValue: string;
  isOpen: boolean;
  onClose: () => void;
  isLocationPoster?: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  title,
  subtitle,
  codeValue,
  isOpen,
  onClose,
  isLocationPoster = false,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !codeValue) return;

    QRCode.toDataURL(codeValue, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1E293B',
        light: '#FFFFFF',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [isOpen, codeValue]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `trashpoint-qr-${codeValue}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
          <QrIcon className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 font-mali">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-3">{subtitle}</p>}

        {/* QR Code Container */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block my-2 shadow-inner">
          {dataUrl ? (
            <img src={dataUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-lg shadow-sm" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
              กำลังสร้าง QR Code...
            </div>
          )}
          <div className="mt-2 text-xs font-mono font-bold text-emerald-800 bg-emerald-100 py-1 px-3 rounded-full inline-block">
            {codeValue}
          </div>
        </div>

        {isLocationPoster && (
          <p className="text-[11px] text-slate-500 mt-2">
            สามารถพิมพ์และนำไปติดที่จุดถังขยะในโรงเรียนได้ทันที
          </p>
        )}

        <div className="flex gap-2.5 mt-4">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดภาพ</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>
    </div>
  );
};
