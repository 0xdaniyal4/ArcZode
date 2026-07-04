/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  targetOpacity: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive sizing
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Setup 3 main orbs
    const orbs: Orb[] = [
      {
        x: width * 0.15,
        y: height * 0.2,
        radius: Math.min(width, height) * 0.3,
        color: '0, 51, 204', // Fallback, will be overridden dynamically
        vx: 0.3,
        vy: 0.2,
        targetOpacity: 0.12,
      },
      {
        x: width * 0.85,
        y: height * 0.8,
        radius: Math.min(width, height) * 0.25,
        color: '255, 215, 0', // Fallback, will be overridden dynamically
        vx: -0.2,
        vy: -0.25,
        targetOpacity: 0.08,
      },
      {
        x: width * 0.5,
        y: height * 0.5,
        radius: Math.min(width, height) * 0.18,
        color: '77, 121, 255', // Fallback, will be overridden dynamically
        vx: 0.15,
        vy: -0.15,
        targetOpacity: 0.06,
      },
    ];

    // Setup 30 tiny particles
    const particleCount = window.innerWidth < 768 ? 12 : 30;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2, // 1px to 3px
        speedY: -(0.2 + Math.random() * 0.4), // Float upwards slowly
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: 0.3 + Math.random() * 0.4, // 0.4 to 0.7
      });
    }

    // Dynamic color helper
    const getThemeColors = () => {
      const computed = getComputedStyle(document.documentElement);
      return {
        primaryRgb: computed.getPropertyValue('--primary-rgb').trim() || '0, 51, 204',
        accentRgb: computed.getPropertyValue('--accent-rgb').trim() || '255, 215, 0',
        accentColor: computed.getPropertyValue('--accent-color').trim() || '#FFD700',
      };
    };

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const { primaryRgb, accentRgb, accentColor } = getThemeColors();

      // Update orb colors on-the-fly to support dynamic theme switching
      orbs[0].color = primaryRgb;
      orbs[1].color = accentRgb;
      orbs[2].color = primaryRgb;

      // Layer 1: Floating blurred Orbs
      orbs.forEach((orb) => {
        // Move orb
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Bounce borders
        if (orb.x < -orb.radius / 2 || orb.x > width + orb.radius / 2) orb.vx *= -1;
        if (orb.y < -orb.radius / 2 || orb.y > height + orb.radius / 2) orb.vy *= -1;

        // Draw radial gradient
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, `rgba(${orb.color}, ${orb.targetOpacity})`);
        grad.addColorStop(0.5, `rgba(${orb.color}, ${orb.targetOpacity * 0.4})`);
        grad.addColorStop(1, `rgba(${orb.color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Layer 3: Grid (Primary dot grid, spacing: 50px, opacity: 0.04)
      ctx.fillStyle = `rgba(${primaryRgb}, 0.04)`;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Layer 2: Theme Accent Particles (floating upward)
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        // Wrap around borders
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(${accentRgb}, ${p.opacity})`;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset glow
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none -z-50 overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Immersive UI ambient blur blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ backgroundColor: 'var(--primary-color)' }} />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ backgroundColor: 'var(--accent-color)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[150px] opacity-5 pointer-events-none" style={{ backgroundColor: 'var(--primary-color)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--primary-color) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }} />
      
      {/* Floating active particle canvas */}
      <canvas
        ref={canvasRef}
        id="animated-bg-canvas"
        className="absolute inset-0 w-full h-full opacity-60"
      />
    </div>
  );
}
