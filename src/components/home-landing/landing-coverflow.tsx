"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale } from "@/contexts/locale-context";
import { HOME_PREVIEW_SLIDES } from "@/lib/home-preview-slides";

const TOTAL = HOME_PREVIEW_SLIDES.length;
const AUTO_MS = 5200;

function wrapIndex(i: number) {
  return (i + TOTAL) % TOTAL;
}

export function LandingCoverflow() {
  const { t } = useLocale();
  const [active, setActive] = useState(2);
  const dragRef = useRef({ x: 0, dragging: false });

  const go = useCallback((i: number) => setActive(wrapIndex(i)), []);

  useEffect(() => {
    const id = window.setInterval(() => setActive((a) => wrapIndex(a + 1)), AUTO_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setActive((a) => wrapIndex(a + 1));
      if (e.key === "ArrowLeft") setActive((a) => wrapIndex(a - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cardStyle = (i: number): CSSProperties => {
    let diff = i - active;
    if (diff > TOTAL / 2) diff -= TOTAL;
    if (diff < -TOTAL / 2) diff += TOTAL;
    const abs = Math.abs(diff);
    const sign = Math.sign(diff) || 0;
    const x = diff * 200;
    const z = -abs * 220;
    const rotY = -sign * Math.min(abs, 2) * 26;
    const scale = abs === 0 ? 1.04 : Math.max(0.78, 1 - abs * 0.1);
    const opacity = abs > 2 ? 0 : 1 - abs * 0.2;

    return {
      transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`,
      opacity,
      zIndex: 100 - abs,
      filter: abs === 0 ? "none" : `blur(${abs * 0.5}px)`,
      pointerEvents: abs > 2 ? "none" : "auto",
    };
  };

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
            <button
              key={s.imageSrc}
              type="button"
              className="home-landing__cf-card"
              style={cardStyle(i)}
              onClick={() => go(i)}
              aria-label={t("home.preview.goToSlide", { n: i + 1 })}
              aria-current={i === active ? "true" : undefined}
            >
              <div className="home-landing__phone-frame">
                <div className="home-landing__phone-screen">
                  <div className="home-landing__phone-post">
                    <div className="home-landing__phone-post-head">
                      <span className="home-landing__phone-avatar" aria-hidden />
                      <div>
                        <span className="home-landing__phone-user">@{s.username}</span>
                        <span className="home-landing__phone-date">{s.dateLabel}</span>
                      </div>
                    </div>
                    <div className="home-landing__phone-photo">
                      <Image
                        src={s.imageSrc}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="320px"
                      />
                    </div>
                    <div className="home-landing__phone-meta">
                      <span className="home-landing__phone-species">{s.species}</span>
                      <span className="home-landing__phone-loc">{s.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="home-landing__cf-meta" key={slide.imageSrc}>
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
