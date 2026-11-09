"use client";

import type { ReactNode } from "react";

type Props = {
  hasSpeciesLoaded: boolean;
  filtersExpanded: boolean;
  children: ReactNode;
};

/** Collapsible filter body — toggle lives next to Find a place. */
export function MapFiltersShell({
  hasSpeciesLoaded,
  filtersExpanded,
  children,
}: Props) {
  if (!hasSpeciesLoaded || !filtersExpanded) return null;

  return (
    <div
      id="map-filters-panel"
      role="region"
      aria-labelledby="map-filters-toggle"
      className="map-page__filter-panel"
    >
      {children}
    </div>
  );
}
