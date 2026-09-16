"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Smartphone,
  ShieldCheck,
  Zap,
  Wifi,
  Cpu,
  ScanLine,
  Sparkles,
} from "lucide-react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
}

export function LoginInteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 500, y: 500 });

  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMousePos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setParallax({
        x: (e.clientX - cx) / cx,
        y: (e.clientY - cy) / cy,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Canvas particle constellation simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Generate tech / smartphone network nodes
    const particleCount = Math.min(65, Math.floor((width * height) / 18000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.5 + 0.2,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const trackMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", trackMouse);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update & Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce at boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Distance to cursor
        const dxMouse = p.x - mouseX;
        const dyMouse = p.y - mouseY;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const glow = distMouse < 180 ? 0.9 : p.baseAlpha;
        ctx.fillStyle = `rgba(45, 212, 191, ${glow})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 120) * 0.18;
            ctx.strokeStyle = `rgba(5, 91, 90, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw connection line to mouse if close
        if (distMouse < 160) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          const mouseLineAlpha = (1 - distMouse / 160) * 0.35;
          ctx.strokeStyle = `rgba(45, 212, 191, ${mouseLineAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", trackMouse);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Base Gradient Canvas (Gloria Ponsel Midnight Teal) */}
      <div className="absolute inset-0 bg-[#011414] bg-radial-at-c from-[#032423] via-[#011717] to-[#010e0e]" />

      {/* 2. Interactive Mouse Spotlight Glow */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `
            radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(5, 91, 90, 0.28), rgba(2, 45, 44, 0.12) 40%, transparent 80%),
            radial-gradient(380px circle at ${mousePos.x}px ${mousePos.y}px, rgba(45, 212, 191, 0.14), transparent 70%)
          `,
        }}
      />

      {/* 3. Ambient Brand Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#055B5A]/25 blur-[120px] animate-pulse" />
      <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-teal-600/15 blur-[140px]" />
      <div className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-700/15 blur-[130px]" />

      {/* 4. Tech / Microchip Circuit Matrix Grid */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #2dd4bf 1px, transparent 1px),
            linear-gradient(to bottom, #2dd4bf 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* 5. Interactive Particle Constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full"
      />

      {/* 6. Wireframe Smartphone Silhouettes in Background (Smartphone Store Theme) */}
      <div
        className="hidden lg:block absolute left-12 top-1/4 w-64 h-[480px] rounded-[42px] border border-teal-500/15 bg-teal-950/5 backdrop-blur-[2px] transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${parallax.x * -18}px, ${parallax.y * -18}px) rotate(-6deg)`,
        }}
      >
        {/* Phone Dynamic Island / Speaker */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-teal-950/40 border border-teal-500/20 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400/40" />
          <div className="w-6 h-1 rounded-full bg-teal-500/20" />
        </div>
        {/* Subtle Screen Graphics */}
        <div className="absolute inset-6 rounded-[28px] border border-dashed border-teal-500/10 flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-[10px] text-teal-400/30 font-mono">
            <span>5G READY</span>
            <Wifi className="w-3 h-3" />
          </div>
          <div className="space-y-1.5">
            <div className="w-3/4 h-2 rounded bg-teal-500/10" />
            <div className="w-1/2 h-2 rounded bg-teal-500/10" />
          </div>
        </div>
      </div>

      {/* Second Phone Silhouette on Right */}
      <div
        className="hidden lg:block absolute right-14 bottom-16 w-60 h-[440px] rounded-[40px] border border-teal-500/15 bg-teal-950/5 backdrop-blur-[2px] transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${parallax.x * 20}px, ${parallax.y * 20}px) rotate(8deg)`,
        }}
      >
        {/* Camera Bump Indicator */}
        <div className="absolute top-4 left-4 w-12 h-12 rounded-2xl border border-teal-500/20 bg-teal-950/30 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border border-teal-400/30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400/40" />
          </div>
        </div>
        <div className="absolute inset-5 rounded-[26px] border border-dashed border-teal-500/10 flex flex-col justify-end p-4">
          <div className="flex items-center justify-between text-[10px] text-teal-400/30 font-mono">
            <span>IMEI VERIFIED</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 7. Floating Thematic Phone Retail Badges with Parallax */}
      {/* Badge 1: Top Left */}
      <div
        className="hidden md:flex absolute top-16 left-20 items-center gap-3 px-4 py-2.5 rounded-2xl border border-teal-500/25 bg-slate-950/60 backdrop-blur-md shadow-xl shadow-teal-950/40 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${parallax.x * -24}px, ${parallax.y * -24}px)`,
        }}
      >
        <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center border border-teal-500/30 shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>Pusat Smartphone</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </p>
          <p className="text-[10px] text-teal-300/80 font-mono">
            Resmi & Garansi Toko
          </p>
        </div>
      </div>

      {/* Badge 2: Bottom Right */}
      <div
        className="hidden md:flex absolute bottom-20 right-20 items-center gap-3 px-4 py-2.5 rounded-2xl border border-teal-500/25 bg-slate-950/60 backdrop-blur-md shadow-xl shadow-teal-950/40 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${parallax.x * 22}px, ${parallax.y * 22}px)`,
        }}
      >
        <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center border border-teal-500/30 shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-white tracking-tight">
            Cek IMEI & Lifecycle
          </p>
          <p className="text-[10px] text-teal-300/80 font-mono">
            100% Terverifikasi POS
          </p>
        </div>
      </div>

      {/* Badge 3: Top Right */}
      <div
        className="hidden xl:flex absolute top-20 right-28 items-center gap-3 px-4 py-2.5 rounded-2xl border border-teal-500/25 bg-slate-950/60 backdrop-blur-md shadow-xl shadow-teal-950/40 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${parallax.x * 16}px, ${parallax.y * -20}px)`,
        }}
      >
        <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center border border-teal-500/30 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-white tracking-tight">
            Kasir POS Cepat
          </p>
          <p className="text-[10px] text-teal-300/80 font-mono">
            Struk Termal & QRIS
          </p>
        </div>
      </div>

      {/* Badge 4: Bottom Left */}
      <div
        className="hidden xl:flex absolute bottom-24 left-28 items-center gap-3 px-4 py-2.5 rounded-2xl border border-teal-500/25 bg-slate-950/60 backdrop-blur-md shadow-xl shadow-teal-950/40 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${parallax.x * -18}px, ${parallax.y * 18}px)`,
        }}
      >
        <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center border border-teal-500/30 shrink-0">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-white tracking-tight">
            Cetak Barcode 50x30
          </p>
          <p className="text-[10px] text-teal-300/80 font-mono">
            Barcode SKU & Label Unit
          </p>
        </div>
      </div>
    </div>
  );
}
