"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { DefaultAvatarIcon } from "@/components/default-avatar-icon";
import { useLocale } from "@/contexts/locale-context";

import { HOME_PREVIEW_SLIDES, type HomePreviewSlide } from "@/lib/home-preview-slides";

type PreviewSlide = HomePreviewSlide;

const PREVIEW_SLIDES = HOME_PREVIEW_SLIDES;

const n = PREVIEW_SLIDES.length;

/** Auto-advance interval: light (one timer); paused when tab hidden or reduced motion. */
const AUTO_ROTATE_MS = 5500;

const NAV_BTN_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-[0_4px_18px_-4px_rgba(15,23,42,0.15)] backdrop-blur-sm transition hover:border-sky-200 hover:bg-white hover:text-sky-700 hover:shadow-[0_8px_22px_-6px_rgba(14,165,233,0.25)] active:scale-[0.97] dark:border-zinc-600 dark:bg-zinc-800/95 dark:text-zinc-300 dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.45)] dark:hover:border-sky-500/35 dark:hover:bg-zinc-700 dark:hover:text-sky-200";

const CHEVRON_PATH = {
  prev:
    "M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z",
  next:
    "M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z",
} as const;

/** Ordering for the two cards behind the front (cycled with `active`). Styles: `home-preview.css`. */
const DECK_BACK_MID: { rel: number; layer: "back" | "mid" }[] = [
  { rel: 2, layer: "back" },
  { rel: 1, layer: "mid" },
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
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-[17px] w-[17px]" aria-hidden>
        <path fillRule="evenodd" d={CHEVRON_PATH[direction]} clipRule="evenodd" />
      </svg>
    </button>
  );
}

function PostMenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="12" cy="6.5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="17.5" r="1.75" />
    </svg>
  );
}

function InstaPostCard({
  slide,
  layer,
  richFooter = false,
}: {
  slide: PreviewSlide;
  layer: "back" | "mid" | "front";
  richFooter?: boolean;
}) {
  const { t } = useLocale();
  const isFront = layer === "front";
  const handle = `@${slide.username}`;

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border bg-white dark:border-zinc-700/90 dark:bg-zinc-950",
        isFront
          ? "border-zinc-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] ring-1 ring-zinc-950/[0.04] dark:border-zinc-600 dark:shadow-black/30 dark:ring-white/[0.06]"
          : "border-zinc-200/60 shadow-sm dark:border-zinc-700 dark:shadow-none",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 border-b border-zinc-100/90 px-3.5 py-2.5 dark:border-zinc-800/90 sm:px-4 sm:py-3">
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
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label={t("home.preview.moreOptions")}
        >
          <PostMenuIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="relative aspect-[4/5] w-full bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={slide.imageSrc}
          alt={`${slide.species} · ${slide.location}`}
          fill
          className="object-cover object-center"
          sizes="(max-width: 480px) min(85vw, 280px), (max-width: 640px) min(72vw, 340px), (max-width: 1024px) min(40vw, 380px), 420px"
          priority={isFront}
          draggable={false}
        />
      </div>

      {isFront && richFooter ? (
        <>
          <div className="flex items-center justify-between border-t border-zinc-100/90 px-2 pt-2 dark:border-zinc-800 sm:px-3">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded-xl p-2 text-zinc-800 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                aria-label={t("home.preview.likePost")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-6 w-6">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-xl p-2 text-zinc-800 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800"
                aria-label={t("home.preview.commentPost")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-6 w-6">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.037 2.311 5.553L3 21l5.447-2.311A8.92 8.92 0 0012 20.25z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-xl p-2 text-zinc-800 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800"
                aria-label={t("home.preview.sharePost")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-zinc-800 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800"
              aria-label={t("home.preview.savePost")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 20.25L12 17.25 6.75 20.25V5.25a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v15z"
                />
              </svg>
            </button>
          </div>

          <div className="px-3.5 pb-1.5 pt-1 sm:px-4">
            <p className="text-[13px] font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("home.preview.engagementLikes", { n: slide.likes })}
            </p>
          </div>

          <div className="space-y-1.5 px-3.5 pb-3 sm:px-4">
            <p className="text-[13px] leading-snug text-zinc-900 dark:text-zinc-100">
              <span className="font-semibold">{handle}</span>{" "}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">{slide.species}</span>
              <span className="text-zinc-600 dark:text-zinc-400"> · {slide.location}</span>
            </p>
            <button
              type="button"
              className="text-left text-[13px] font-medium text-zinc-500 transition hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400"
            >
              {t("home.preview.viewAllComments", { n: slide.comments })}
            </button>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
              {slide.dateLabel}
            </p>
          </div>
        </>
      ) : (
        <div className="space-y-1 px-3.5 py-3 sm:px-4 sm:py-3.5">
          <p className="text-xs text-zinc-500">{slide.dateLabel}</p>
          <p className="text-sm leading-snug text-zinc-900 dark:text-zinc-100">
            <span className="font-semibold">{handle}</span>{" "}
            <span className="font-medium text-emerald-700 dark:text-emerald-400">{slide.species}</span>
            <span className="text-zinc-600 dark:text-zinc-300"> · {slide.location}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** Matches `--fishlist-preview-card-*` steps in `home-preview.css` for consistent resize behavior. */
const CARD_MAX_W_CLASS =
  "w-full max-w-[min(100%,17.5rem)] min-[480px]:max-w-[min(100%,20rem)] sm:max-w-[min(100%,22.5rem)] lg:max-w-[min(100%,24rem)]";

/** Slightly wider cards on the logged-out landing (pairs with `.fishlist-preview-stack--rich`). */
const CARD_LANDING_W_CLASS =
  "w-full max-w-[min(100%,19rem)] min-[480px]:max-w-[min(100%,22rem)] sm:max-w-[min(100%,24rem)] lg:max-w-[min(100%,26rem)]";

export function HomePreviewCarousel({
  className = "",
  variant = "default",
  align = "center",
  richFooter = false,
}: {
  className?: string;
  variant?: "default" | "hero";
  /** `start` = hug the left (e.g. logged-out landing); default keeps the stack centered in its row. */
  align?: "center" | "start";
  /** Extra like/comment row + larger card footprint (landing page). */
  richFooter?: boolean;
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

  const cardWClass = richFooter ? CARD_LANDING_W_CLASS : CARD_MAX_W_CLASS;

  const stackClass = [
    "fishlist-preview-stack",
    variant === "hero" ? "fishlist-preview-stack--hero" : "",
    variant === "hero" ? "mt-1" : "mt-2",
    align === "start" ? "fishlist-preview-stack--align-start" : "",
    richFooter ? "fishlist-preview-stack--rich" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const dotsMargin = variant === "hero" ? "mt-5 sm:mt-6" : "mt-6 sm:mt-8";

  return (
    <section
      className={className}
      aria-label={t("home.preview.carouselLabel")}
      aria-roledescription="carousel"
    >
      {/* Narrow screens: controls above the deck. `sm+`: side buttons (see below). */}
      <div
        className={
          variant === "hero"
            ? align === "start"
              ? "mb-2 flex justify-start gap-2 sm:hidden"
              : "mb-2 flex justify-center gap-2 sm:hidden"
            : align === "start"
              ? "mb-2 flex justify-start gap-2 sm:mb-3 sm:hidden"
              : "mb-2 flex justify-center gap-2 sm:mb-3 sm:hidden"
        }
      >
        <CarouselArrow direction="prev" label={t("home.preview.prev")} onClick={() => go(-1)} />
        <CarouselArrow direction="next" label={t("home.preview.next")} onClick={() => go(1)} />
      </div>

        <div
          className={
            variant === "hero"
              ? "relative sm:px-11 md:px-12"
              : "relative sm:px-12 md:px-14 lg:px-16"
          }
        >
        <div
          className={[
            stackClass,
            "rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/90 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-200 dark:focus-visible:ring-offset-zinc-900",
          ].join(" ")}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onKeyDown={onStackKeyDown}
          tabIndex={0}
          role="group"
        >
          {DECK_BACK_MID.map(({ rel, layer }) => {
            const idx = (active + rel) % n;
            return (
              <div
                key={`${layer}-${idx}`}
                className={`fishlist-preview-deck-layer fishlist-preview-deck-layer--${layer}`}
                aria-hidden
              >
                <div className={cardWClass}>
                  <InstaPostCard slide={PREVIEW_SLIDES[idx]} layer={layer} richFooter={richFooter} />
                </div>
              </div>
            );
          })}

          <div
            key={active}
            className={[
              "relative z-10 will-change-transform rounded-2xl shadow-[0_22px_48px_-14px_rgba(15,23,42,0.22)] ring-1 ring-zinc-950/[0.05] dark:shadow-[0_28px_56px_-18px_rgba(0,0,0,0.65)] dark:ring-white/[0.07]",
              align === "start" ? "ml-0 mr-auto" : "mx-auto",
              cardWClass,
              direction === 1 ? "fishlist-preview-front-next" : "fishlist-preview-front-prev",
            ].join(" ")}
          >
            <InstaPostCard slide={PREVIEW_SLIDES[active]} layer="front" richFooter={richFooter} />
          </div>
        </div>

        {/* After the deck in DOM so controls paint above the cards; still keyboard-accessible tab order follows DOM. */}
        <div
          className={
            align === "start"
              ? "pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-11 items-center justify-start sm:flex"
              : "pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-11 items-center justify-center sm:flex"
          }
        >
          <div className="pointer-events-auto">
            <CarouselArrow direction="prev" label={t("home.preview.prev")} onClick={() => go(-1)} />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden w-11 items-center justify-center sm:flex">
          <div className="pointer-events-auto">
            <CarouselArrow direction="next" label={t("home.preview.next")} onClick={() => go(1)} />
          </div>
        </div>
      </div>

        <div
          className={`${dotsMargin} flex items-center gap-2 ${align === "start" ? "justify-start" : "justify-center"}`}
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
              "rounded-full transition-all duration-300 ease-out",
              idx === active
                ? "h-2 w-8 bg-gradient-to-r from-sky-500 to-sky-600 shadow-[0_0_16px_-2px_rgba(14,165,233,0.55)] dark:from-sky-400 dark:to-sky-500 dark:shadow-[0_0_18px_-2px_rgba(56,189,248,0.35)]"
                : "h-2 w-2 bg-zinc-300/90 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
