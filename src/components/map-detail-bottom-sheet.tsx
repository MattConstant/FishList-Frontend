"use client";

import { useRef, useState } from "react";
import { LakeStockingTab } from "@/components/lake-stocking-tab";
import { MapForecastPopup } from "@/components/map-forecast-popup";
import { useLocale } from "@/contexts/locale-context";
import type { WaterbodyGroup } from "@/lib/geohub";

type MapLakeTab = "stocking" | "forecast";

type Props = {
  mode: "forecast" | "lake";
  lat: number;
  lng: number;
  lake?: WaterbodyGroup;
  /** Reverse-geocoded area line for forecast mode (from map page). */
  forecastAreaLabel?: string | null;
  forecastAreaLabelLoading?: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
  canUseAi: boolean;
};

function tabBtnClass(active: boolean) {
  return [
    "map-page__sheet-tab",
    active ? "map-page__sheet-tab--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function MapDetailBottomSheet({
  mode,
  lat,
  lng,
  lake,
  forecastAreaLabel = null,
  forecastAreaLabelLoading = false,
  expanded,
  onExpandedChange,
  onClose,
  canUseAi,
}: Props) {
  const { t } = useLocale();
  const [lakeTab, setLakeTab] = useState<MapLakeTab>("stocking");
  /** Handle bar: drag up/down to expand/collapse; small movement = tap toggle. */
  const handleDragRef = useRef<{ y: number; pointerId: number } | null>(null);

  const peekSubtitle =
    mode === "lake" && lake
      ? t("forecast.mapLakeSummary", {
          species: lake.speciesSet.size,
          total: lake.totalFish.toLocaleString(),
        })
      : mode === "forecast" && forecastAreaLabelLoading
        ? t("forecast.loading")
        : mode === "forecast" && forecastAreaLabel
          ? forecastAreaLabel
          : t("forecast.mapForecastPeek");

  const DRAG_PX = 40;

  const googleMapsHref = `https://www.google.com/maps?q=${encodeURIComponent(
    `${lat},${lng}`,
  )}`;

  function onHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    handleDragRef.current = { y: e.clientY, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const start = handleDragRef.current;
    handleDragRef.current = null;
    if (!start || start.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const dy = e.clientY - start.y;
    if (dy < -DRAG_PX) {
      onExpandedChange(true);
    } else if (dy > DRAG_PX) {
      onExpandedChange(false);
    } else {
      onExpandedChange(!expanded);
    }
  }

  function onHandlePointerCancel() {
    handleDragRef.current = null;
  }

  return (
    <div className="map-page__bottom-sheet">
      <div className="map-page__bottom-sheet-inner">
        <button
          type="button"
          className="map-page__bottom-sheet-handle"
          aria-expanded={expanded}
          aria-label={expanded ? t("forecast.mapSheetCollapse") : t("forecast.mapSheetExpand")}
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
        >
          <span className="map-page__bottom-sheet-handle-bar" />
        </button>

        <div className="map-page__bottom-sheet-head">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {mode === "lake" && lake ? lake.waterbody : t("forecast.popupTitle")}
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {peekSubtitle}
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-zinc-400 dark:text-zinc-500">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <button
              type="button"
              onClick={() => onExpandedChange(!expanded)}
              className="map-page__bottom-sheet-icon-btn"
              aria-label={expanded ? t("forecast.mapSheetCollapse") : t("forecast.mapSheetExpand")}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-5 w-5 transition-transform ${expanded ? "" : "rotate-180"}`}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <a
              href={googleMapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="map-page__bottom-sheet-icon-btn"
              title={t("forecast.openInGoogleMaps")}
              aria-label={t("forecast.openInGoogleMaps")}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 109.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="map-page__bottom-sheet-icon-btn"
              aria-label={t("forecast.mapSheetClose")}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {mode === "lake" && lake ? (
          <div
            className="map-page__bottom-sheet-tabs"
            role="tablist"
            aria-label={t("forecast.mapSheetTabsAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={lakeTab === "stocking"}
              className={tabBtnClass(lakeTab === "stocking")}
              onClick={() => {
                setLakeTab("stocking");
                onExpandedChange(true);
              }}
            >
              {t("forecast.mapTabStocking")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lakeTab === "forecast"}
              className={tabBtnClass(lakeTab === "forecast")}
              onClick={() => {
                setLakeTab("forecast");
                onExpandedChange(true);
              }}
            >
              {t("forecast.mapTabForecast")}
            </button>
          </div>
        ) : null}

        <div
          className={[
            "map-page__bottom-sheet-body",
            expanded ? "map-page__bottom-sheet-body--expanded" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {mode === "forecast" ? (
            <MapForecastPopup
              key={`fc-${lat.toFixed(5)}-${lng.toFixed(5)}`}
              lat={lat}
              lng={lng}
              omitOuterHeader
            />
          ) : null}
          {mode === "lake" && lake && lakeTab === "stocking" ? (
            <LakeStockingTab group={lake} canUseAi={canUseAi} />
          ) : null}
          {mode === "lake" && lake && lakeTab === "forecast" ? (
            <MapForecastPopup
              key={`lake-fc-${lat.toFixed(5)}-${lng.toFixed(5)}`}
              lat={lat}
              lng={lng}
              omitOuterHeader
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
