"use client";

import type { ReactNode } from "react";

type Props = {
  hasSpeciesLoaded: boolean;
  filtersExpanded: boolean;
  setFiltersExpanded: (v: boolean | ((p: boolean) => boolean)) => void;
  filterSummaryLine: string;
  children: ReactNode;
};

export function MapFiltersShell({
  hasSpeciesLoaded,
  filtersExpanded,
  setFiltersExpanded,
  filterSummaryLine,
  children,
}: Props) {
  if (!hasSpeciesLoaded) return null;

  return (
    <div className="map-page__filter-shell map-page__chrome">
      <div
        className={[
          "map-page__filter-bar",
          filtersExpanded ? "map-page__filter-bar--expanded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          onClick={() => setFiltersExpanded((v) => !v)}
          className="map-page__filter-toggle"
          aria-expanded={filtersExpanded}
          aria-controls="map-filters-panel"
          id="map-filters-toggle"
        >
          <span className="map-page__filter-heading">Filters</span>
          {!filtersExpanded && (
            <span className="map-page__filter-summary">{filterSummaryLine}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFiltersExpanded((v) => !v)}
          className="map-page__filter-chevron-btn"
          aria-expanded={filtersExpanded}
          aria-label={filtersExpanded ? "Collapse filters" : "Expand filters"}
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 transition-transform ${filtersExpanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {filtersExpanded ? (
        <div
          id="map-filters-panel"
          role="region"
          aria-labelledby="map-filters-toggle"
          className="map-page__filter-panel"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
