"use client";

import { useEffect, type ReactNode } from "react";

const MAP_ROUTE_CLASS = "fishlist-map-route";

/**
 * Lock the app shell scroll while the map is mounted so touch pans go to Leaflet
 * instead of the scrollable <main> (common mobile Safari / Chrome bug).
 */
export default function MapLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(MAP_ROUTE_CLASS);
    return () => {
      root.classList.remove(MAP_ROUTE_CLASS);
    };
  }, []);

  return children;
}
