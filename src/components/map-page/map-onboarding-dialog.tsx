"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { hasSeenMapOnboarding, markMapOnboardingSeen } from "@/lib/map-onboarding";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  /** Wait until map data is ready before showing the guide. */
  ready: boolean;
};

type OnboardingItem = {
  iconClass?: string;
  titleKey: string;
  bodyKey: string;
};

const ITEMS: OnboardingItem[] = [
  {
    iconClass: "map-page__legend-icon--stocking",
    titleKey: "map.onboarding.stockingTitle",
    bodyKey: "map.onboarding.stockingBody",
  },
  {
    iconClass: "map-page__legend-icon--presence",
    titleKey: "map.onboarding.presenceTitle",
    bodyKey: "map.onboarding.presenceBody",
  },
  {
    titleKey: "map.onboarding.layersTitle",
    bodyKey: "map.onboarding.layersBody",
  },
  {
    titleKey: "map.onboarding.filtersTitle",
    bodyKey: "map.onboarding.filtersBody",
  },
  {
    titleKey: "map.onboarding.searchTitle",
    bodyKey: "map.onboarding.searchBody",
  },
  {
    titleKey: "map.onboarding.logCatchTitle",
    bodyKey: "map.onboarding.logCatchBody",
  },
  {
    titleKey: "map.onboarding.tapTitle",
    bodyKey: "map.onboarding.tapBody",
  },
];

export function MapOnboardingDialog({ t, ready }: Props) {
  const titleId = useId();
  const dismissRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || hasSeenMapOnboarding()) return;
    const id = window.setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(id);
  }, [ready]);

  const dismiss = useCallback(() => {
    markMapOnboardingSeen();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    dismissRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="map-page__onboarding-root">
      <button
        type="button"
        className="map-page__onboarding-backdrop"
        aria-label={t("map.onboarding.close")}
        onClick={dismiss}
      />
      <div
        className="map-page__onboarding-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="map-page__onboarding-head">
          <h2 id={titleId} className="map-page__onboarding-title">
            {t("map.onboarding.title")}
          </h2>
          <button
            type="button"
            className="map-page__onboarding-close"
            onClick={dismiss}
            aria-label={t("map.onboarding.close")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="map-page__onboarding-lead">{t("map.onboarding.lead")}</p>

        <ul className="map-page__onboarding-list">
          {ITEMS.map((item) => (
            <li key={item.titleKey} className="map-page__onboarding-item">
              {item.iconClass ? (
                <span
                  className={`map-page__legend-icon map-page__onboarding-icon ${item.iconClass}`}
                  aria-hidden
                />
              ) : (
                <span className="map-page__onboarding-bullet" aria-hidden />
              )}
              <div className="min-w-0">
                <p className="map-page__onboarding-item-title">{t(item.titleKey)}</p>
                <p className="map-page__onboarding-item-body">{t(item.bodyKey)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="map-page__onboarding-foot">
          <button
            ref={dismissRef}
            type="button"
            className="map-page__onboarding-dismiss"
            onClick={dismiss}
          >
            {t("map.onboarding.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
