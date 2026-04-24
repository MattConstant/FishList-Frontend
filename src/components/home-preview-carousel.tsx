"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { DefaultAvatarIcon } from "@/components/default-avatar-icon";
import { useLocale } from "@/contexts/locale-context";

type PreviewSlide = {
  imageSrc: string;
  username: string;
  species: string;
  location: string;
  dateLabel: string;
};

/** Rows: image, username, species, location, date — keeps data dense without repeated keys */
const PREVIEW_SLIDE_ROWS: [string, string, string, string, string][] = [
  ["/example1.webp", "brookie_mike", "Brook trout", "Nipigon River", "Apr 2026"],
  ["/example2.webp", "shore_lunch", "Walleye", "Lake of the Woods", "Apr 2026"],
  ["/example3.webp", "early_spring", "Steelhead", "Ottawa River", "Mar 2026"],
  ["/example4.jpg", "quiet_creek", "Smallmouth bass", "Georgian Bay", "Apr 2026"],
  ["/example5.jpg", "sunrise_cast", "Northern pike", "French River", "Apr 2026"],
  ["/example6.avif", "maple_angler", "Lake trout", "Algonquin Highlands", "Apr 2026"],
];

const PREVIEW_SLIDES: PreviewSlide[] = PREVIEW_SLIDE_ROWS.map(
  ([imageSrc, username, species, location, dateLabel]) => ({
    imageSrc,
    username,
    species,
    location,
    dateLabel,
  }),
);

const n = PREVIEW_SLIDES.length;

/** Auto-advance interval — light (one timer); paused when tab hidden or reduced motion. */
const AUTO_ROTATE_MS = 5500;

const NAV_BTN_CLASS =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

const CHEVRON_PATH = {
  prev:
    "M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z",
  next:
    "M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z",
} as const;

const DECK_BACK_MID: {
  rel: number;
  layer: "back" | "mid";
  className: string;
  style: React.CSSProperties;
}[] = [
  {
    rel: 2,
    layer: "back",
    className:
      "pointer-events-none absolute left-1/2 top-1/2 w-[92%] max-w-[26rem] -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[94%]",
    style: {
      transform: "translate(-50%, calc(-50% + 28px)) rotate(-11deg) scale(0.88)",
      zIndex: 0,
      opacity: 0.72,
    },
  },
  {
    rel: 1,
    layer: "mid",
    className:
      "pointer-events-none absolute left-1/2 top-1/2 w-[96%] max-w-[27rem] -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
    style: {
      transform: "translate(-50%, calc(-50% + 14px)) rotate(9deg) scale(0.94)",
      zIndex: 5,
      opacity: 0.88,
    },
  },
];

function CarouselArrow({
  direction,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={NAV_BTN_CLASS} aria-label={label}>
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path fillRule="evenodd" d={CHEVRON_PATH[direction]} clipRule="evenodd" />
      </svg>
    </button>
  );
}

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
      <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-inner sm:h-11 sm:w-11"
          aria-hidden
        >
          <DefaultAvatarIcon className="h-[55%] w-[55%] text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{handle}</p>
          <p className="truncate text-xs text-zinc-500">{slide.location}</p>
        </div>
        <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
          ···
        </span>
      </div>

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

const STACK_CLASS =
  "relative mx-auto mt-5 flex min-h-[min(78vh,640px)] w-full max-w-[min(100%,28rem)] items-center justify-center sm:max-w-[min(100%,30rem)] sm:min-h-[min(72vh,680px)]";

/** Tighter stack when embedded beside the hero (landing). */
const STACK_CLASS_HERO =
  "relative mx-auto mt-1 flex min-h-[min(40vh,360px)] w-full max-w-[min(100%,28rem)] items-center justify-center sm:min-h-[min(42vh,400px)] sm:max-w-[min(100%,30rem)]";

export function HomePreviewCarousel({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "hero";
}) {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback((delta: number) => {
    if (delta === 0) return;
    setDirection(delta > 0 ? 1 : -1);
    setActive((a) => ((a + delta) % n + n) % n);
  }, []);

  const goToSlide = useCallback(
    (idx: number) => {
      if (idx === active) return;
      const forward = (idx - active + n) % n;
      const backward = (active - idx + n) % n;
      setDirection(forward <= backward ? 1 : -1);
      setActive(idx);
    },
    [active],
  );

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

  const onStackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  const stackClass = variant === "hero" ? STACK_CLASS_HERO : STACK_CLASS;
  const dotsMargin = variant === "hero" ? "mt-6" : "mt-8";

  return (
    <section
      className={className}
      aria-label={t("home.preview.carouselLabel")}
      aria-roledescription="carousel"
    >
      <div
        className={
          variant === "hero"
            ? "mb-1 flex items-center justify-end gap-2 sm:mb-2"
            : "flex items-center justify-end gap-2"
        }
      >
        <CarouselArrow direction="prev" label={t("home.preview.prev")} onClick={() => go(-1)} />
        <CarouselArrow direction="next" label={t("home.preview.next")} onClick={() => go(1)} />
      </div>

      <div
        className={stackClass}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={onStackKeyDown}
        tabIndex={0}
        role="group"
      >
        {DECK_BACK_MID.map(({ rel, layer, className: deckClass, style }) => {
          const idx = (active + rel) % n;
          return (
            <div
              key={`${layer}-${idx}`}
              className={deckClass}
              style={style}
              aria-hidden
            >
              <InstaPostCard slide={PREVIEW_SLIDES[idx]} layer={layer} />
            </div>
          );
        })}

        <div
          key={active}
          className={[
            "relative z-10 w-full max-w-[min(100%,28rem)] will-change-transform sm:max-w-[min(100%,30rem)]",
            direction === 1 ? "fishlist-preview-front-next" : "fishlist-preview-front-prev",
          ].join(" ")}
          style={{ filter: "drop-shadow(0 22px 40px rgba(0,0,0,0.18))" }}
        >
          <InstaPostCard slide={PREVIEW_SLIDES[active]} layer="front" />
        </div>
      </div>

      <div
        className={`${dotsMargin} flex justify-center gap-2`}
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
