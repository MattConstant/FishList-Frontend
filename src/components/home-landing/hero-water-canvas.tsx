"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

type Ripple = {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  born: number;
};

const FRAME_MS = 50;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

/** Animated wave bands behind the landing hero (decorative, throttled for INP). */
export function HeroWaterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ ripples: [] as Ripple[], t: 0, w: 0, h: 0, visible: true });
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => true,
  );
  const enabled = !reducedMotion;

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let lastFrame = 0;
    let running = false;

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
    window.addEventListener("resize", resize, { passive: true });

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        stateRef.current.visible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.05 },
    );
    visibilityObserver.observe(canvas);

    const onVisibility = () => {
      stateRef.current.visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const dropInterval = window.setInterval(() => {
      if (!stateRef.current.visible || document.visibilityState !== "visible") return;
      const { w, h } = stateRef.current;
      if (w < 1 || h < 1) return;
      stateRef.current.ripples.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: 0,
        maxR: 80 + Math.random() * 100,
        alpha: 0.4,
        born: stateRef.current.t,
      });
    }, 1400);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!stateRef.current.visible || document.visibilityState !== "visible") return;
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      const s = stateRef.current;
      const { w, h } = s;
      if (w < 1 || h < 1) return;

      ctx.clearRect(0, 0, w, h);

      const bandCount = 5;
      for (let i = 0; i < bandCount; i++) {
        const yBase = (i + 0.5) * (h / bandCount);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 18) {
          const y =
            yBase +
            Math.sin(x * 0.006 + s.t * 0.0008 + i * 0.7) * 7 +
            Math.sin(x * 0.013 + s.t * 0.0014 + i) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(14, 165, 233, ${0.04 + (i / bandCount) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      s.ripples = s.ripples.filter((rip) => {
        const age = (s.t - rip.born) / 1000;
        rip.r = age * 70;
        const fade = 1 - rip.r / rip.maxR;
        if (fade <= 0) return false;

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(14, 165, 233, ${rip.alpha * fade * 0.55})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        return true;
      });

      s.t += FRAME_MS;
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const idleId =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(start, { timeout: 1500 })
        : window.setTimeout(start, 300);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      clearInterval(dropInterval);
      if (typeof cancelIdleCallback !== "undefined" && typeof idleId === "number") {
        cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as number);
      }
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      visibilityObserver.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className="home-landing__hero-canvas" aria-hidden />;
}
