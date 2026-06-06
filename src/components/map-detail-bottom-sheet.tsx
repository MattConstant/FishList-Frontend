"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LakePresenceTab } from "@/components/lake-presence-tab";
import { LakeStockingTab } from "@/components/lake-stocking-tab";
import { MapForecastPopup } from "@/components/map-forecast-popup";
import { useLocale } from "@/contexts/locale-context";
import type { WaterbodyGroup } from "@/lib/geohub";
import { formatAppInteger } from "@/lib/format-app-locale";
import type { CampSpotResponse } from "@/lib/api";

type MapLakeTab = "stocking" | "forecast";
type MapPresenceTab = "species" | "forecast";

export type PresenceLake = {
  name: string;
  speciesSummary: string;
};

type Props = {
  mode: "forecast" | "lake" | "presence" | "camp";
  lat: number;
  lng: number;
  lake?: WaterbodyGroup;
  presence?: PresenceLake;
  camp?: CampSpotResponse;
  /** Reverse-geocoded area line for forecast mode (from map page). */
  forecastAreaLabel?: string | null;
  forecastAreaLabelLoading?: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
  canUseAi: boolean;
  showFavoriteButton?: boolean;
  favoriteEnabled?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  canDeleteCamp?: boolean;
  onDeleteCamp?: () => void;
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
  presence,
  camp,
  forecastAreaLabel = null,
  forecastAreaLabelLoading = false,
  expanded,
  onExpandedChange,
  onClose,
  canUseAi,
  showFavoriteButton = true,
  favoriteEnabled = true,
  isFavorite,
  onToggleFavorite,
  canDeleteCamp = false,
  onDeleteCamp,
}: Props) {
  const { t, locale } = useLocale();
  const [lakeTab, setLakeTab] = useState<MapLakeTab>("stocking");
  const [presenceTab, setPresenceTab] = useState<MapPresenceTab>("species");
  const [enlargedCampPhotoIndex, setEnlargedCampPhotoIndex] = useState<number | null>(
    null,
  );
  const campPhotoUrls =
    mode === "camp" && camp?.imageUrls && camp.imageUrls.length > 0
      ? camp.imageUrls.slice(0, 4)
      : [];

  useEffect(() => {
    setEnlargedCampPhotoIndex(null);
  }, [camp?.id, mode]);

  useEffect(() => {
    if (enlargedCampPhotoIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEnlargedCampPhotoIndex(null);
        return;
      }
      if (campPhotoUrls.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setEnlargedCampPhotoIndex(
          (i) =>
            (i ?? 0) <= 0 ? campPhotoUrls.length - 1 : (i ?? 0) - 1,
        );
      } else if (e.key === "ArrowRight") {
        setEnlargedCampPhotoIndex(
          (i) => ((i ?? 0) + 1) % campPhotoUrls.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlargedCampPhotoIndex, campPhotoUrls.length]);
  const presenceSpeciesCount =
    mode === "presence" && presence
      ? presence.speciesSummary
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean).length
      : 0;
  /** Handle bar: drag up/down to expand/collapse; small movement = tap toggle. */
  const handleDragRef = useRef<{ y: number; pointerId: number } | null>(null);

  const peekSubtitle =
    mode === "lake" && lake
      ? t("forecast.mapLakeSummary", {
          species: lake.speciesSet.size,
          total: formatAppInteger(lake.totalFish, locale),
        })
      : mode === "presence" && presence
        ? t("forecast.mapPresenceCount", { count: presenceSpeciesCount })
        : mode === "camp" && camp
          ? camp.visibility === "PRIVATE"
            ? "Private camp spot"
            : camp.visibility === "FRIENDS"
              ? "Friends-only camp spot"
              : "Public camp spot"
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

  const enlargedCampPhotoUrl =
    enlargedCampPhotoIndex != null
      ? campPhotoUrls[enlargedCampPhotoIndex]
      : null;

  return (
    <>
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
              {mode === "lake" && lake
                ? lake.waterbody
                : mode === "presence" && presence
                  ? presence.name || t("forecast.mapPresenceUnknown")
                  : mode === "camp" && camp
                    ? camp.name
                  : t("forecast.popupTitle")}
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {peekSubtitle}
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-zinc-400 dark:text-zinc-500">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-wrap items-start justify-end gap-1">
            {showFavoriteButton ? (
              <span
                className="inline-flex shrink-0"
                title={
                  !favoriteEnabled
                    ? t("map.favorite.loginRequiredShort")
                    : isFavorite
                      ? t("map.favorite.toggleRemove")
                      : t("map.favorite.toggleAdd")
                }
              >
                <button
                  type="button"
                  disabled={!favoriteEnabled}
                  onClick={() => favoriteEnabled && onToggleFavorite()}
                  className={[
                    "map-page__bottom-sheet-icon-btn",
                    !favoriteEnabled
                      ? "cursor-not-allowed opacity-35"
                      : isFavorite
                        ? "map-page__bottom-sheet-favorite--on"
                        : "text-zinc-400 dark:text-zinc-500",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={
                    !favoriteEnabled
                      ? t("map.favorite.loginRequiredShort")
                      : isFavorite
                        ? t("map.favorite.toggleRemove")
                        : t("map.favorite.toggleAdd")
                  }
                  aria-pressed={favoriteEnabled ? isFavorite : undefined}
                  aria-disabled={!favoriteEnabled}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden
                    fill="currentColor"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </span>
            ) : null}
            {mode === "camp" && canDeleteCamp && onDeleteCamp ? (
              <button
                type="button"
                onClick={onDeleteCamp}
                className="map-page__bottom-sheet-icon-btn text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                aria-label="Delete camp"
                title="Delete camp"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M8.5 2.75A.75.75 0 019.25 2h1.5a.75.75 0 01.75.75V4h3.75a.75.75 0 010 1.5h-.69l-.74 11.1A2.25 2.25 0 0111.58 18H8.42a2.25 2.25 0 01-2.24-2.4l-.74-11.1H4.75a.75.75 0 010-1.5H8.5V2.75zM7.5 5.5l.73 10.92a.75.75 0 00.75.68h2.04a.75.75 0 00.75-.68L12.5 5.5h-5z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            ) : null}
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
              className="map-page__bottom-sheet-icon-btn shrink-0 no-underline"
              title={t("forecast.openInGoogleMaps")}
              aria-label={t("forecast.mapLinkAria")}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 3h4v4M20 2l-5.5 5.5" />
                <rect x="3" y="9" width="10" height="10" rx="1.2" />
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

        {mode === "presence" && presence ? (
          <div
            className="map-page__bottom-sheet-tabs"
            role="tablist"
            aria-label={t("forecast.mapSheetTabsAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={presenceTab === "species"}
              className={tabBtnClass(presenceTab === "species")}
              onClick={() => {
                setPresenceTab("species");
                onExpandedChange(true);
              }}
            >
              {t("forecast.mapTabPresence")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={presenceTab === "forecast"}
              className={tabBtnClass(presenceTab === "forecast")}
              onClick={() => {
                setPresenceTab("forecast");
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
          {mode === "presence" && presence && presenceTab === "species" ? (
            <LakePresenceTab
              name={presence.name}
              speciesSummary={presence.speciesSummary}
            />
          ) : null}
          {mode === "presence" && presence && presenceTab === "forecast" ? (
            <MapForecastPopup
              key={`presence-fc-${lat.toFixed(5)}-${lng.toFixed(5)}`}
              lat={lat}
              lng={lng}
              omitOuterHeader
            />
          ) : null}
          {mode === "camp" && camp ? (
            <div className="space-y-3">
              {campPhotoUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {campPhotoUrls.map((u, i) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setEnlargedCampPhotoIndex(i)}
                      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                      aria-label={t("map.camp.enlargePhoto")}
                    >
                      <div className="relative aspect-square w-full cursor-zoom-in">
                        <Image
                          src={u}
                          alt={camp.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No photos uploaded.</p>
              )}

              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Details</p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  Saved by <span className="font-semibold">@{camp.username}</span>
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  Visibility:{" "}
                  <span className="font-medium">
                    {camp.visibility === "PRIVATE"
                      ? "Private"
                      : camp.visibility === "FRIENDS"
                        ? "Friends"
                        : "Public"}
                  </span>
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>

    {enlargedCampPhotoUrl ? (
      <div
        className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/85 p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t("map.camp.photoLightbox")}
        onClick={() => setEnlargedCampPhotoIndex(null)}
      >
        <button
          type="button"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-2xl leading-none text-white transition hover:bg-black/70"
          aria-label={t("map.camp.closePhoto")}
          onClick={(e) => {
            e.stopPropagation();
            setEnlargedCampPhotoIndex(null);
          }}
        >
          <span aria-hidden>×</span>
        </button>
        {campPhotoUrls.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/70 sm:left-6"
              aria-label={t("map.camp.photoPrev")}
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedCampPhotoIndex((i) =>
                  (i ?? 0) <= 0 ? campPhotoUrls.length - 1 : (i ?? 0) - 1,
                );
              }}
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/70 sm:right-6"
              aria-label={t("map.camp.photoNext")}
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedCampPhotoIndex(
                  (i) => ((i ?? 0) + 1) % campPhotoUrls.length,
                );
              }}
            >
              <span aria-hidden>›</span>
            </button>
          </>
        ) : null}
        <div
          className="relative h-[min(85vh,56rem)] w-full max-w-[min(95vw,56rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={enlargedCampPhotoUrl}
            alt={camp?.name ?? ""}
            fill
            className="object-contain"
            unoptimized
            sizes="95vw"
            priority
          />
        </div>
      </div>
    ) : null}
    </>
  );
}
