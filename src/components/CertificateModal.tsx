/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { X, Printer, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { formatThaiFullDate } from '../utils/dateFormatter';
import confetti from 'canvas-confetti';

interface CertificateModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  profile,
  isOpen,
  onClose,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2E9E4F', '#FFC93C', '#10B981', '#F59E0B'],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-4 md:p-6 my-auto text-center border-4 border-amber-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Card Printable Area */}
        <div
          ref={certificateRef}
          className="relative bg-gradient-to-b from-amber-50/50 via-white to-emerald-50/40 p-6 rounded-2xl border-2 border-amber-400 shadow-inner overflow-hidden"
        >
          {/* Decorative Corner Ornaments */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500 rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-500 rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-500 rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500 rounded-br-lg" />

          {/* School Emblem / Badge */}
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md border-2 border-amber-300">
              <Award className="w-8 h-8 text-amber-200" />
            </div>
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-widest text-emerald-800 mb-0.5">
            โรงเรียนสีเขียวเพื่ออนาคต
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">Green School Initiative • Trash Point</p>

          <h2 className="text-xl md:text-2xl font-bold font-mali text-amber-900 tracking-wide mb-1">
            เกียรติบัตรยกย่องเชิดชูเกียรติ
          </h2>
          <p className="text-xs text-slate-600 mb-3">เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</p>

          {/* Student Name */}
          <div className="py-1 px-4 my-2 border-b-2 border-dotted border-amber-500/80 inline-block">
            <h3 className="text-lg md:text-xl font-bold text-slate-900">
              {profile.name}
            </h3>
          </div>

          <p className="text-xs text-slate-600 mt-1 mb-2">
            ระดับชั้น <strong>{profile.className}</strong> {profile.number ? `เลขที่ ${profile.number}` : ''}
          </p>

          <p className="text-xs text-slate-700 leading-relaxed max-w-sm mx-auto mb-4">
            ได้มีจิตสำนึกรักสิ่งแวดล้อม ร่วมเก็บและคัดแยกขยะในสถานศึกษา
            <br />
            จนมีคะแนนสะสมรวมครบ <strong>100 คะแนน</strong>
            <br />
            สมควรได้รับการยกย่องเป็น
            <span className="block text-sm font-bold text-emerald-700 mt-1 font-mali">
              "นักอนุรักษ์สิ่งแวดล้อมดีเด่น ประจำปีการศึกษา ๒๕๖๙"
            </span>
          </p>

          {/* Golden Seal & Signature Lines */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-amber-200 text-[11px] text-slate-600">
            <div className="text-center w-32">
              <div className="h-7 border-b border-slate-400 mb-1 flex items-end justify-center">
                <span className="font-mali text-emerald-800 text-xs italic">ครูวิมล ธรรมชาติ</span>
              </div>
              <p>ครูที่ปรึกษากิจกรรม</p>
            </div>

            {/* Official Gold Seal Badge */}
            <div className="relative flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center shadow-md border-2 border-amber-200">
                <CheckCircle2 className="w-6 h-6 text-amber-900" />
              </div>
              <span className="text-[9px] font-bold text-amber-800 mt-0.5">ตราประทับรับรอง</span>
            </div>

            <div className="text-center w-32">
              <div className="h-7 border-b border-slate-400 mb-1 flex items-end justify-center">
                <span className="font-mali text-emerald-800 text-xs italic">สมเกียรติ สถิตย์</span>
              </div>
              <p>ผู้อำนวยการสถานศึกษา</p>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-slate-400">
            ออกให้ ณ วันที่ {formatThaiFullDate(new Date())}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={triggerConfetti}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>โปรยพลุฉลอง</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ / บันทึก PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
