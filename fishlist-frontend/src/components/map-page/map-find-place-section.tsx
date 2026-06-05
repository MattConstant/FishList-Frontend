"use client";

import type { FormEvent } from "react";
import type { GeocodeSearchHit } from "@/lib/geocode-search-types";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  lakePinQuery: string;
  setLakePinQuery: (v: string) => void;
  lakePinError: string;
  lakePinSearching: boolean;
  lakeSuggestions: GeocodeSearchHit[];
  lakeSuggestionsOpen: boolean;
  setLakeSuggestionsOpen: (open: boolean) => void;
  lakeSuggestionIndex: number;
  setLakeSuggestionIndex: (i: number | ((prev: number) => number)) => void;
  onSubmitSearch: (e: FormEvent) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectSuggestion: (s: GeocodeSearchHit) => void;
};

export function MapFindPlaceSection({
  t,
  lakePinQuery,
  setLakePinQuery,
  lakePinError,
  lakePinSearching,
  lakeSuggestions,
  lakeSuggestionsOpen,
  setLakeSuggestionsOpen,
  lakeSuggestionIndex,
  setLakeSuggestionIndex,
  onSubmitSearch,
  onSearchKeyDown,
  onSelectSuggestion,
}: Props) {
  return (
    <section className="map-page__filter-section" aria-label={t("map.searchLake.section")}>
      <div className="map-page__filter-section-head">
        <h3 className="map-page__filter-section-title">{t("map.searchLake.section")}</h3>
        <span className="map-page__filter-info">
          <button
            type="button"
            className="map-page__filter-info-icon"
            aria-label={t("map.searchLake.info")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.25 9a.75.75 0 01.75-.75h.01a.75.75 0 01.74.84l-.46 4.13a.75.75 0 11-1.49-.16l.45-4.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="map-page__filter-info-tooltip" role="tooltip">
            {t("map.searchLake.info")}
          </span>
        </span>
      </div>
      <form className="map-page__lake-pin-form" onSubmit={onSubmitSearch} role="search">
        <div className="map-page__lake-pin-search">
          <span className="map-page__lake-pin-search-icon" aria-hidden>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M9 3a6 6 0 104.472 10.03l3.249 3.249a1 1 0 001.414-1.414l-3.249-3.249A6 6 0 009 3zM5 9a4 4 0 118 0 4 4 0 01-8 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            id="map-waterbody-pin"
            type="text"
            value={lakePinQuery}
            onChange={(e) => setLakePinQuery(e.target.value)}
            onFocus={() => {
              if (lakeSuggestions.length > 0) setLakeSuggestionsOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setLakeSuggestionsOpen(false), 120);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={t("map.searchLake.placeholder")}
            className="map-page__field map-page__lake-pin-input w-full"
            autoComplete="off"
            role="combobox"
            aria-expanded={lakeSuggestionsOpen}
            aria-controls="map-waterbody-pin-list"
            aria-autocomplete="list"
          />
          {lakePinSearching && (
            <span className="map-page__lake-pin-spinner" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M12 2a10 10 0 019.95 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
            </span>
          )}
          {lakeSuggestionsOpen && lakeSuggestions.length > 0 && (
            <ul
              id="map-waterbody-pin-list"
              className="map-page__lake-pin-suggestions"
              role="listbox"
            >
              {lakeSuggestions.map((s, idx) => (
                <li
                  key={`${s.id}-${s.latitude}-${s.longitude}`}
                  role="option"
                  aria-selected={idx === lakeSuggestionIndex}
                  className={[
                    "map-page__lake-pin-suggestion",
                    idx === lakeSuggestionIndex ? "map-page__lake-pin-suggestion--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectSuggestion(s);
                  }}
                  onMouseEnter={() => setLakeSuggestionIndex(idx)}
                >
                  <span className="map-page__lake-pin-suggestion-name">{s.name}</span>
                  <span className="map-page__lake-pin-suggestion-meta">
                    {[s.admin1, s.country].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="map-page__lake-pin-btn"
          disabled={lakePinSearching || lakePinQuery.trim().length < 2}
          aria-label={t("map.searchLake.action")}
          title={t("map.searchLake.action")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M9 3a6 6 0 104.472 10.03l3.249 3.249a1 1 0 001.414-1.414l-3.249-3.249A6 6 0 009 3zM5 9a4 4 0 118 0 4 4 0 01-8 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </form>
      {lakePinError ? <p className="map-page__filter-ara-status">{lakePinError}</p> : null}
    </section>
  );
}
