"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/locale-context";

type PreviewSlide = {
  imageSrc: string;
  username: string;
  species: string;
  location: string;
  dateLabel: string;
};

const PREVIEW_SLIDES: PreviewSlide[] = [
  {
    imageSrc: "/example1.webp",
    username: "brookie_mike",
    species: "Brook trout",
    location: "Nipigon River",
    dateLabel: "Apr 2026",
  },
  {
    imageSrc: "/example2.webp",
    username: "shore_lunch",
    species: "Walleye",
    location: "Lake of the Woods",
    dateLabel: "Apr 2026",
  },
  {
    imageSrc: "/example3.webp",
    username: "early_spring",
    species: "Steelhead",
    location: "Ottawa River",
    dateLabel: "Mar 2026",
  },
  {
    imageSrc: "/example4.jpg",
    username: "quiet_creek",
    species: "Smallmouth bass",
    location: "Georgian Bay",
    dateLabel: "Apr 2026",
  },
  {
    imageSrc: "/example5.jpg",
    username: "sunrise_cast",
    species: "Northern pike",
    location: "French River",
    dateLabel: "Apr 2026",
  },
  {
    imageSrc: "/example6.avif",
    username: "maple_angler",
    species: "Lake trout",
    location: "Algonquin Highlands",
    dateLabel: "Apr 2026",
  },
];

const n = PREVIEW_SLIDES.length;

/** Auto-advance interval — light (one timer); paused when tab hidden or reduced motion. */
const AUTO_ROTATE_MS = 5500;

function InstaPostCard({
  slide,
  layer,
}: {
  slide: PreviewSlide;
  layer: "back" | "mid" | "front";
}) {
  const isFront = layer === "front";
  const handle = `@${slide.username}`;

  return (
    <div
      className={[
        "overflow-hidden rounded-[14px] border bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-950",
        isFront
          ? "border-zinc-200/90 shadow-zinc-900/20 ring-1 ring-black/[0.06] dark:shadow-black/40 dark:ring-white/10"
          : "border-zinc-200/70 dark:border-zinc-700",
      ].join(" ")}
    >
      {/* Header — IG-style row */}
      <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-lg text-white shadow-inner sm:h-11 sm:w-11"
          aria-hidden
        >
          🎣
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{handle}</p>
          <p className="truncate text-xs text-zinc-500">{slide.location}</p>
        </div>
        <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
          ···
        </span>
      </div>

      {/* Photo — portrait ratio like IG feed */}
      <div className="relative aspect-[4/5] w-full bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={slide.imageSrc}
          alt={`${slide.species} — ${slide.location}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 92vw, 420px"
          priority={isFront}
          draggable={false}
        />
      </div>

      {/* Footer — caption */}
      <div className="space-y-1 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <p className="text-xs text-zinc-500">{slide.dateLabel}</p>
        <p className="text-sm leading-snug text-zinc-900 dark:text-zinc-100">
          <span className="font-semibold">{handle}</span>{" "}
          <span className="font-medium text-emerald-700 dark:text-emerald-400">{slide.species}</span>
          <span className="text-zinc-600 dark:text-zinc-300"> — {slide.location}</span>
        </p>
      </div>
    </div>
  );
}

export function HomePreviewCarousel({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  /** 1 = advance (next / swipe left), -1 = back (prev / swipe right) — drives enter animation */
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback((delta: number) => {
    if (delta === 0) return;
    setDirection(delta > 0 ? 1 : -1);
    setActive((a) => ((a + delta) % n + n) % n);
  }, []);

  const goToSlide = useCallback((idx: number) => {
    if (idx === active) return;
    const forward = (idx - active + n) % n;
    const backward = (active - idx + n) % n;
    setDirection(forward <= backward ? 1 : -1);
    setActive(idx);
  }, [active]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let id: ReturnType<typeof setInterval>;

    const schedule = () => {
      clearInterval(id);
      id = setInterval(() => go(1), AUTO_ROTATE_MS);
    };

    const onVisibility = () => {
      if (document.hidden) clearInterval(id);
      else schedule();
    };

    if (!document.hidden) schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [go]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -48) go(1);
    else if (dx > 48) go(-1);
  };

  const backIdx = (active + 2) % n;
  const midIdx = (active + 1) % n;

  return (
    <section className={className} aria-label={t("home.preview.carouselLabel")} aria-roledescription="carousel">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          aria-label={t("home.preview.prev")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          aria-label={t("home.preview.next")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Stack — back → mid → front (Instagram-style deck) */}
      <div
        className="relative mx-auto mt-5 flex min-h-[min(78vh,640px)] w-full max-w-[min(100%,28rem)] items-center justify-center sm:max-w-[min(100%,30rem)] sm:min-h-[min(72vh,680px)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          }
        }}
        tabIndex={0}
        role="group"
      >
        {/* Furthest card */}
        <div
          key={`back-${backIdx}`}
          className="pointer-events-none absolute left-1/2 top-1/2 w-[92%] max-w-[26rem] -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[94%]"
          style={{
            transform: "translate(-50%, calc(-50% + 28px)) rotate(-11deg) scale(0.88)",
            zIndex: 0,
            opacity: 0.72,
          }}
          aria-hidden
        >
          <InstaPostCard slide={PREVIEW_SLIDES[backIdx]} layer="back" />
        </div>

        {/* Middle card */}
        <div
          key={`mid-${midIdx}`}
          className="pointer-events-none absolute left-1/2 top-1/2 w-[96%] max-w-[27rem] -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: "translate(-50%, calc(-50% + 14px)) rotate(9deg) scale(0.94)",
            zIndex: 5,
            opacity: 0.88,
          }}
          aria-hidden
        >
          <InstaPostCard slide={PREVIEW_SLIDES[midIdx]} layer="mid" />
        </div>

        {/* Front card — interactive focus; key remount triggers enter animation */}
        <div
          key={active}
          className={[
            "relative z-10 w-full max-w-[min(100%,28rem)] will-change-transform sm:max-w-[min(100%,30rem)]",
            direction === 1 ? "fishlist-preview-front-next" : "fishlist-preview-front-prev",
          ].join(" ")}
          style={{
            filter: "drop-shadow(0 22px 40px rgba(0,0,0,0.18))",
          }}
        >
          <InstaPostCard slide={PREVIEW_SLIDES[active]} layer="front" />
        </div>
      </div>

      <div
        className="mt-8 flex justify-center gap-2"
        role="tablist"
        aria-label={t("home.preview.dotsLabel")}
      >
        {PREVIEW_SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === active}
            aria-label={t("home.preview.goToSlide", { n: idx + 1 })}
            onClick={() => goToSlide(idx)}
            className={[
              "h-2.5 rounded-full transition-all duration-300",
              idx === active ? "w-8 bg-sky-600 dark:bg-sky-500" : "w-2.5 bg-zinc-300 dark:bg-zinc-600",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
