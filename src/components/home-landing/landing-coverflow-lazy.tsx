"use client";

import { useEffect, useRef, useState } from "react";
import { LandingCoverflow } from "@/components/home-landing/landing-coverflow";

/** Mount the coverflow carousel only when near the viewport (less main-thread work at load). */
export function LandingCoverflowLazy() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || mounted) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(frame);
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          obs.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  return (
    <div ref={hostRef} className="home-landing__coverflow-lazy">
      {mounted ? <LandingCoverflow /> : <div className="home-landing__coverflow-stage" aria-hidden />}
    </div>
  );
}
