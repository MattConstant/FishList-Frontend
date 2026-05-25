"use client";

import { useEffect, useRef, useState } from "react";
import { LandingReveal } from "@/components/home-landing/landing-reveal";
import { useLocale } from "@/contexts/locale-context";
import { fetchPublicStats, type PublicStatsResponse } from "@/lib/public-stats";

function AnimatedStat({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting || started) return;
          started = true;
          const start = performance.now();
          const duration = 1800;
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - p) ** 3;
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="home-landing__stat">
      <div className="home-landing__stat-num">{display.toLocaleString()}</div>
      <div className="home-landing__stat-label">{label}</div>
    </div>
  );
}

export function LandingStats() {
  const { t } = useLocale();
  const [stats, setStats] = useState<PublicStatsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;

  const items = stats
    ? [
        { value: stats.catchesLogged, label: t("home.landing.stats.catches") },
        { value: stats.lakesMapped, label: t("home.landing.stats.lakes") },
        { value: stats.speciesTracked, label: t("home.landing.stats.species") },
        { value: stats.tripsPlanned, label: t("home.landing.stats.trips") },
      ]
    : null;

  return (
    <LandingReveal className="home-landing__stats-reveal">
      <div className="home-landing__stats" aria-busy={!stats}>
        {items
          ? items.map((item) => (
              <AnimatedStat key={item.label} value={item.value} label={item.label} />
            ))
          : [0, 1, 2, 3].map((i) => (
              <div key={i} className="home-landing__stat home-landing__stat--placeholder" aria-hidden>
                <div className="home-landing__stat-num">—</div>
                <div className="home-landing__stat-label">&nbsp;</div>
              </div>
            ))}
      </div>
    </LandingReveal>
  );
}
