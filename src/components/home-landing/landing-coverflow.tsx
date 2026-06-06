"use client";

import Image from "next/image";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLocale } from "@/contexts/locale-context";
import { HOME_PREVIEW_SLIDES } from "@/lib/home-preview-slides";

const TOTAL = HOME_PREVIEW_SLIDES.length;
const AUTO_MS = 5200;
const USER_PAUSE_MS = 12_000;

function wrapIndex(i: number) {
  return (i + TOTAL) % TOTAL;
}

function cardStyle(active: number, i: number): CSSProperties {
  let diff = i - active;
  if (diff > TOTAL / 2) diff -= TOTAL;
  if (diff < -TOTAL / 2) diff += TOTAL;
  const abs = Math.abs(diff);
  const sign = Math.sign(diff) || 0;
  const x = diff * 200;
  const z = -abs * 220;
  const rotY = -sign * Math.min(abs, 2) * 26;
  const scale = abs === 0 ? 1.04 : Math.max(0.78, 1 - abs * 0.1);
  const opacity = abs > 2 ? 0 : 1 - abs * 0.22;

  return {
    transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`,
    opacity,
    zIndex: 100 - abs,
    pointerEvents: abs > 2 ? "none" : "auto",
  };
}

type CardProps = {
  slide: (typeof HOME_PREVIEW_SLIDES)[number];
  index: number;
  active: number;
  ariaLabel: string;
  onSelect: (index: number) => void;
};

const CoverflowCard = memo(function CoverflowCard({
  slide,
  index,
  active,
  ariaLabel,
  onSelect,
}: CardProps) {
  const isActive = index === active;

  return (
    <button
      type="button"
      className="home-landing__cf-card"
      style={cardStyle(active, index)}
      onClick={() => onSelect(index)}
      aria-label={ariaLabel}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="home-landing__phone-frame">
        <div className="home-landing__phone-screen">
          <div className="home-landing__phone-post">
            <div className="home-landing__phone-post-head">
              <span className="home-landing__phone-avatar" aria-hidden />
              <div>
                <span className="home-landing__phone-user">@{slide.username}</span>
                <span className="home-landing__phone-date">{slide.dateLabel}</span>
              </div>
            </div>
            <div className="home-landing__phone-photo">
              <Image
                src={slide.imageSrc}
                alt=""
                fill
                className="object-cover"
                sizes="320px"
                loading={isActive || Math.abs(index - active) <= 1 ? "eager" : "lazy"}
              />
            </div>
            <div className="home-landing__phone-meta">
              <span className="home-landing__phone-species">{slide.species}</span>
              <span className="home-landing__phone-loc">{slide.location}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
});

export function LandingCoverflow() {
  const { t } = useLocale();
  const [active, setActive] = useState(2);
  const dragRef = useRef({ x: 0, dragging: false });
  const pauseUntilRef = useRef(0);

  const go = useCallback((i: number) => {
    pauseUntilRef.current = performance.now() + USER_PAUSE_MS;
    startTransition(() => setActive(wrapIndex(i)));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (performance.now() < pauseUntilRef.current) return;
      startTransition(() => setActive((a) => wrapIndex(a + 1)));
    }, AUTO_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(active + 1);
      if (e.key === "ArrowLeft") go(active - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go]);

  const onDragStart = (clientX: number) => {
    dragRef.current = { x: clientX, dragging: true };
  };

  const onDragEnd = (clientX: number) => {
    if (!dragRef.current.dragging) return;
    const delta = clientX - dragRef.current.x;
    if (Math.abs(delta) > 60) go(active + (delta < 0 ? 1 : -1));
    dragRef.current.dragging = false;
  };

  const slide = HOME_PREVIEW_SLIDES[active];

  return (
    <div className="home-landing__coverflow-wrap">
      <div
        className="home-landing__coverflow-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("home.preview.carouselLabel")}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseUp={(e) => onDragEnd(e.clientX)}
        onTouchStart={(e) => onDragStart(e.touches[0]?.clientX ?? 0)}
        onTouchEnd={(e) => onDragEnd(e.changedTouches[0]?.clientX ?? 0)}
      >
        <div className="home-landing__coverflow">
          {HOME_PREVIEW_SLIDES.map((s, i) => (
            <CoverflowCard
              key={s.imageSrc}
              slide={s}
              index={i}
              active={active}
              ariaLabel={t("home.preview.goToSlide", { n: i + 1 })}
              onSelect={go}
            />
          ))}
        </div>

        <div className="home-landing__cf-meta">
          <p className="home-landing__cf-num">
            {String(active + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </p>
          <p className="home-landing__cf-title">{slide.species}</p>
          <p className="home-landing__cf-desc">
            @{slide.username} · {slide.location}
          </p>
        </div>
      </div>

      <div className="home-landing__cf-controls">
        <button
          type="button"
          className="home-landing__cf-arrow"
          onClick={() => go(active - 1)}
          aria-label={t("home.preview.prev")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        {HOME_PREVIEW_SLIDES.map((s, i) => (
          <button
            key={s.imageSrc}
            type="button"
            className={`home-landing__cf-dot${i === active ? " home-landing__cf-dot--active" : ""}`}
            onClick={() => go(i)}
            aria-label={t("home.preview.goToSlide", { n: String(i + 1) })}
          />
        ))}
        <button
          type="button"
          className="home-landing__cf-arrow"
          onClick={() => go(active + 1)}
          aria-label={t("home.preview.next")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
