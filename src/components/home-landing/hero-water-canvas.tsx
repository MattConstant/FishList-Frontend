"use client";

import { useEffect, useRef } from "react";

type Ripple = {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  born: number;
};

/** Animated wave bands + ripples behind the landing hero (decorative). */
export function HeroWaterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ ripples: [] as Ripple[], t: 0, w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.w = rect.width;
      stateRef.current.h = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);

    const dropInterval = window.setInterval(() => {
      const { w, h } = stateRef.current;
      stateRef.current.ripples.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0,
        maxR: 80 + Math.random() * 120,
        alpha: 0.45,
        born: stateRef.current.t,
      });
    }, 900);

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        r: 0,
        maxR: 220,
        alpha: 0.7,
        born: stateRef.current.t,
      });
    };
    canvas.addEventListener("click", onClick);

    const draw = () => {
      const s = stateRef.current;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);

      const bandCount = 7;
      for (let i = 0; i < bandCount; i++) {
        const yBase = (i + 0.5) * (h / bandCount);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 14) {
          const y =
            yBase +
            Math.sin(x * 0.006 + s.t * 0.0008 + i * 0.7) * 8 +
            Math.sin(x * 0.013 + s.t * 0.0014 + i) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(14, 165, 233, ${0.04 + (i / bandCount) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      s.ripples = s.ripples.filter((rip) => {
        const age = (s.t - rip.born) / 1000;
        rip.r = age * 80;
        const fade = 1 - rip.r / rip.maxR;
        if (fade <= 0) return false;

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(14, 165, 233, ${rip.alpha * fade * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (rip.r > 18) {
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.r - 18, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(14, 165, 233, ${rip.alpha * fade * 0.3})`;
          ctx.stroke();
        }
        return true;
      });

      s.t += 16;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(dropInterval);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return <canvas ref={canvasRef} className="home-landing__hero-canvas" aria-hidden />;
}
