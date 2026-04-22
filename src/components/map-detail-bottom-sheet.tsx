"use client";

import { useState } from "react";
import { LakeFishTab } from "@/components/lake-fish-tab";
import { LakeStockingTab } from "@/components/lake-stocking-tab";
import { MapForecastPopup } from "@/components/map-forecast-popup";
import { useLocale } from "@/contexts/locale-context";
import type { WaterbodyGroup } from "@/lib/geohub";

export type MapLakeTab = "fish" | "stocking" | "forecast";

type Props = {
  mode: "forecast" | "lake";
  lat: number;
  lng: number;
  lake?: WaterbodyGroup;
  /** Map-click forecast: reverse-geocoded place name (optional). */
  forecastAreaLabel?: string | null;
  forecastAreaLabelLoading?: boolean;
  defaultLakeTab?: MapLakeTab;
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
  defaultLakeTab = "fish",
  expanded,
  onExpandedChange,
  onClose,
  canUseAi,
}: Props) {
  const { t } = useLocale();
  const [lakeTab, setLakeTab] = useState<MapLakeTab>(defaultLakeTab);

  const peekSubtitle =
    mode === "lake" && lake
      ? t("forecast.mapLakeSummary", {
          species: lake.speciesSet.size,
          total: lake.totalFish.toLocaleString(),
        })
      : t("forecast.mapForecastPeek");

  const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lng}`,
  )}`;

  return (
    <div className="map-page__bottom-sheet">
      <div className="map-page__bottom-sheet-inner">
        <button
          type="button"
          className="map-page__bottom-sheet-handle"
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className="map-page__bottom-sheet-handle-bar" />
        </button>

        <div className="map-page__bottom-sheet-head">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {mode === "lake" && lake
                ? lake.waterbody
                : forecastAreaLabelLoading
                  ? t("forecast.areaNameLoading")
                  : forecastAreaLabel ?? t("forecast.popupTitle")}
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {peekSubtitle}
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-zinc-400 dark:text-zinc-500">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
            <a
              href={googleMapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/90 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-sky-300 dark:hover:border-sky-600 dark:hover:bg-zinc-800"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0 opacity-90"
                aria-hidden
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              <span className="min-w-0 truncate">{t("forecast.openInGoogleMaps")}</span>
            </a>
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
                className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
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

        {mode === "lake" && lake && expanded ? (
          <div
            className="map-page__bottom-sheet-tabs"
            role="tablist"
            aria-label={t("forecast.mapSheetTabsAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={lakeTab === "fish"}
              className={tabBtnClass(lakeTab === "fish")}
              onClick={() => setLakeTab("fish")}
            >
              {t("forecast.mapTabFish")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lakeTab === "stocking"}
              className={tabBtnClass(lakeTab === "stocking")}
              onClick={() => setLakeTab("stocking")}
            >
              {t("forecast.mapTabStocking")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lakeTab === "forecast"}
              className={tabBtnClass(lakeTab === "forecast")}
              onClick={() => setLakeTab("forecast")}
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
          {mode === "lake" && lake && lakeTab === "fish" ? (
            <LakeFishTab group={lake} />
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
