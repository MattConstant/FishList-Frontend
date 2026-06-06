"use client";

import { formatAppInteger } from "@/lib/format-app-locale";

type Locale = "en" | "fr";

type Props = {
  loading: boolean;
  loadedCount: number;
  locale: Locale;
};

export function MapPageLoadingOverlay({ loading, loadedCount, locale }: Props) {
  if (!loading) return null;
  return (
    <div className="map-page__loading-overlay">
      <div className="flex flex-col items-center gap-2">
        <svg className="h-8 w-8 animate-spin text-sky-600" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path
            d="M12 2a10 10 0 019.95 9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-75"
          />
        </svg>
        <p className="map-page__loading-status">
          {formatAppInteger(loadedCount, locale)} records loaded…
        </p>
      </div>
    </div>
  );
}

type PlacingProps = {
  placingMode: "catch" | "camp";
};

export function MapPagePlacingBanner({ placingMode }: PlacingProps) {
  return (
    <div className="map-page__placing-banner">
      Click anywhere on the map to place your {placingMode === "camp" ? "camp" : "catch"}
    </div>
  );
}
