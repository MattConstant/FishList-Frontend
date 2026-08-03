"use client";

import type { FormEvent } from "react";
import type { GeocodeSearchHit } from "@/lib/geocode-search-types";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  /** False during SSR / first client paint so `disabled` matches on hydrate. */
  hydrated: boolean;
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
  /** Species data ready — show the compact filters control. */
  filtersAvailable?: boolean;
  filtersExpanded?: boolean;
  setFiltersExpanded?: (v: boolean | ((p: boolean) => boolean)) => void;
};

export function MapFindPlaceSection({
  t,
  hydrated,
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
  filtersAvailable = false,
  filtersExpanded = false,
  setFiltersExpanded,
}: Props) {
  return (
    <section className="map-page__search-bar" aria-label={t("map.searchLake.section")}>
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
          disabled={
            hydrated
              ? lakePinSearching || lakePinQuery.trim().length < 2
              : undefined
          }
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
        {filtersAvailable && setFiltersExpanded ? (
          <button
            type="button"
            className={[
              "map-page__filters-icon-btn",
              filtersExpanded ? "map-page__filters-icon-btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-expanded={filtersExpanded}
            aria-controls="map-filters-panel"
            id="map-filters-toggle"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-label={
              filtersExpanded ? t("map.filters.collapse") : t("map.filters.expand")
            }
            title={filtersExpanded ? t("map.filters.collapse") : t("map.filters.expand")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm3 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}
      </form>
      {lakePinError ? <p className="map-page__filter-ara-status">{lakePinError}</p> : null}
    </section>
  );
}
