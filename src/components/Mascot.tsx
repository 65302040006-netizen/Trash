/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type MascotMood = 'happy' | 'excited' | 'detective' | 'scanning' | 'thinking' | 'empty';

interface MascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({
  mood = 'happy',
  size = 'md',
  className = '',
  animate = true,
}) => {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    xl: 'w-48 h-48',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center ${sizeMap[size]} ${className} ${
        animate && mood === 'excited' ? 'animate-bounce' : ''
      }`}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#34D399" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <linearGradient id="lidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#10B981" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Soft shadow under mascot */}
        <ellipse cx="100" cy="186" rx="60" ry="10" fill="#000000" opacity="0.12" />

        {/* Can Lid Handle */}
        <path
          d="M 85 45 C 85 30 115 30 115 45"
          stroke="#047857"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Can Lid */}
        <path
          d="M 46 54 C 46 48 56 44 68 44 L 132 44 C 144 44 154 48 154 54 L 154 62 L 46 62 Z"
          fill="url(#lidGrad)"
          stroke="#065F46"
          strokeWidth="3"
        />

        {/* Can Body */}
        <path
          d="M 55 62 L 67 170 C 68 178 76 182 86 182 L 114 182 C 124 182 132 178 133 170 L 145 62 Z"
          fill="url(#bodyGrad)"
          stroke="#065F46"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Vertical stripes for classic trash can look */}
        <line x1="82" y1="80" x2="86" y2="165" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
        <line x1="100" y1="80" x2="100" y2="165" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
        <line x1="118" y1="80" x2="114" y2="165" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />

        {/* Mascot Eyes */}
        {mood === 'happy' || mood === 'excited' ? (
          <>
            {/* Left Eye */}
            <ellipse cx="84" cy="98" rx="7" ry="9" fill="#1E293B" />
            <circle cx="82" cy="95" r="2.8" fill="#FFFFFF" />
            <circle cx="86" cy="101" r="1.2" fill="#FFFFFF" />
            {/* Right Eye */}
            <ellipse cx="116" cy="98" rx="7" ry="9" fill="#1E293B" />
            <circle cx="114" cy="95" r="2.8" fill="#FFFFFF" />
            <circle cx="118" cy="101" r="1.2" fill="#FFFFFF" />
          </>
        ) : mood === 'detective' ? (
          <>
            {/* Left Eye Wink */}
            <path d="M 77 98 Q 84 92 91 98" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Right Eye Curious */}
            <ellipse cx="116" cy="97" rx="8" ry="10" fill="#1E293B" />
            <circle cx="114" cy="94" r="3" fill="#FFFFFF" />
          </>
        ) : mood === 'scanning' ? (
          <>
            {/* High-tech focused eyes */}
            <ellipse cx="84" cy="98" rx="7" ry="9" fill="#1E293B" />
            <circle cx="85" cy="98" r="3" fill="#38BDF8" />
            <ellipse cx="116" cy="98" rx="7" ry="9" fill="#1E293B" />
            <circle cx="115" cy="98" r="3" fill="#38BDF8" />
          </>
        ) : (
          /* thinking or empty */
          <>
            <circle cx="84" cy="98" r="6" fill="#1E293B" />
            <circle cx="82" cy="96" r="2" fill="#FFFFFF" />
            <circle cx="116" cy="98" r="6" fill="#1E293B" />
            <circle cx="114" cy="96" r="2" fill="#FFFFFF" />
          </>
        )}

        {/* Rosy Cheeks */}
        <ellipse cx="72" cy="110" rx="6" ry="3.5" fill="#F43F5E" opacity="0.45" />
        <ellipse cx="128" cy="110" rx="6" ry="3.5" fill="#F43F5E" opacity="0.45" />

        {/* Mouth */}
        {mood === 'excited' ? (
          <path
            d="M 89 110 Q 100 126 111 110 Z"
            fill="#E11D48"
            stroke="#1E293B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : mood === 'thinking' ? (
          <path
            d="M 92 114 Q 100 110 108 114"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === 'empty' ? (
          <path
            d="M 91 113 Q 100 120 109 113"
            stroke="#1E293B"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M 90 111 Q 100 122 110 111"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Recycle Badge on chest */}
        <g transform="translate(100, 142) scale(0.38)">
          <path
            d="M -15 -25 L 15 -25 L 5 -40"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 25 -5 L 35 25 L 15 25"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -10 25 L -35 10 L -25 -5"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Detective Magnifying Glass Overlay */}
        {mood === 'detective' && (
          <g transform="translate(125, 80) rotate(15)">
            <circle cx="20" cy="20" r="14" fill="#38BDF8" fillOpacity="0.25" stroke="#0284C7" strokeWidth="3" />
            <line x1="30" y1="30" x2="44" y2="44" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        {/* Scanning laser beam effect */}
        {mood === 'scanning' && (
          <g opacity="0.7">
            <line x1="30" y1="120" x2="170" y2="120" stroke="#38BDF8" strokeWidth="2.5" strokeDasharray="4 4" />
            <polygon points="100,60 30,120 170,120" fill="#38BDF8" fillOpacity="0.1" />
          </g>
        )}

        {/* Excited sparkles / star */}
        {mood === 'excited' && (
          <g transform="translate(145, 30) scale(0.8)">
            <path
              d="M 12 2 L 15 9 L 22 10 L 17 15 L 18 22 L 12 18 L 6 22 L 7 15 L 2 10 L 9 9 Z"
              fill="url(#starGrad)"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
