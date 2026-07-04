/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: number;
}

export default function Logo({ className = '', iconOnly = false, size = 40 }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon with glowing and shine effect */}
      <div 
        className="relative overflow-hidden flex items-center justify-center rounded-xl p-0.5"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full animate-pulse-glow"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.45))' }}
        >
          <defs>
            <linearGradient id="blueGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0033CC" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Outer Ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            fill="#000820" 
            stroke="url(#blueGoldGrad)" 
            strokeWidth="3.5" 
          />

          {/* Top Gold Loop Arrow */}
          <path 
            d="M 32 40 A 21 21 0 0 1 68 40" 
            fill="none" 
            stroke="#FFD700" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            filter="url(#glow-filter)"
          />
          {/* Bottom Blue Loop Arrow */}
          <path 
            d="M 68 60 A 21 21 0 0 1 32 60" 
            fill="none" 
            stroke="#0033CC" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
          />

          {/* Arrow Heads */}
          <polygon points="68,34 74,45 62,43" fill="#FFD700" />
          <polygon points="32,66 26,55 38,57" fill="#0033CC" />

          {/* Glowing Center Z */}
          <text 
            x="50" 
            y="59" 
            fontFamily="Outfit, sans-serif" 
            fontWeight="900" 
            fontSize="30" 
            fill="#FFD700" 
            textAnchor="middle"
            filter="url(#glow-filter)"
          >
            Z
          </text>
        </svg>

        {/* Shine sweeping overlays (running every 4 seconds) */}
        <div className="absolute inset-0 pointer-events-none shine-effect" />
      </div>

      {/* Brand Text */}
      {!iconOnly && (
        <div className="flex items-baseline font-display font-black text-2xl tracking-tight leading-none">
          <span className="text-white font-extrabold">Arc</span>
          <span 
            className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-gold ml-0.5"
            style={{ textShadow: '0 0 15px rgba(255, 215, 0, 0.2)' }}
          >
            Zode
          </span>
        </div>
      )}
    </div>
  );
}
