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

type Props = {
  /** SSR counts so labels and layout are stable on first paint. */
  initialStats?: PublicStatsResponse;
};

export function LandingStats({ initialStats }: Props) {
  const { t } = useLocale();
  const [stats, setStats] = useState<PublicStatsResponse | null>(initialStats ?? null);
  const [error, setError] = useState(false);

  const labelItems = [
    t("home.landing.stats.catches"),
    t("home.landing.stats.lakes"),
    t("home.landing.stats.species"),
    t("home.landing.stats.trips"),
  ];

  useEffect(() => {
    if (initialStats) return;
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
  }, [initialStats]);

  if (error) return null;

  const items = stats
    ? [
        { value: stats.catchesLogged, label: labelItems[0] },
        { value: stats.lakesMapped, label: labelItems[1] },
        { value: stats.speciesTracked, label: labelItems[2] },
        { value: stats.tripsPlanned, label: labelItems[3] },
      ]
    : null;

  return (
    <LandingReveal className="home-landing__stats-reveal">
      <div className="home-landing__stats" aria-busy={!stats}>
        {items
          ? items.map((item) => (
              <AnimatedStat key={item.label} value={item.value} label={item.label} />
            ))
          : labelItems.map((statLabel) => (
              <div key={statLabel} className="home-landing__stat home-landing__stat--placeholder" aria-hidden>
                <div className="home-landing__stat-num">0</div>
                <div className="home-landing__stat-label">{statLabel}</div>
              </div>
            ))}
      </div>
    </LandingReveal>
  );
}
