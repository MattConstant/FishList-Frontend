/**
 * Provinces with stocking data on the map (multi-select).
 * Ontario = live GeoHub ArcGIS; Yukon = curated stocked-lakes program;
 * Quebec = MFFP wildlife-reserve “stocking permitted” lists (coords from PDFs).
 */

export const STOCKING_PROVINCES = ["ON", "YT", "QC"] as const;

export type StockingProvince = (typeof STOCKING_PROVINCES)[number];

export const MAP_PROVINCES_KEY = "fishlist-map-stocking-provinces";

/** Default: Ontario only. */
export const DEFAULT_STOCKING_PROVINCES: readonly StockingProvince[] = ["ON"];

export type ProvinceMapFrame = {
  center: [number, number];
  /** SW / NE corners for fitBounds. */
  bounds: [[number, number], [number, number]];
  maxZoom: number;
};

export const PROVINCE_MAP_FRAMES: Record<StockingProvince, ProvinceMapFrame> = {
  ON: {
    center: [51, -85],
    bounds: [
      [41.6, -95.2],
      [57.0, -74.0],
    ],
    maxZoom: 7,
  },
  YT: {
    center: [62.5, -135],
    bounds: [
      [59.5, -141.2],
      [65.2, -128.0],
    ],
    maxZoom: 7,
  },
  QC: {
    center: [47.5, -72],
    bounds: [
      [44.8, -79.8],
      [50.5, -64.0],
    ],
    maxZoom: 7,
  },
};

export function isStockingProvince(v: string): v is StockingProvince {
  return (STOCKING_PROVINCES as readonly string[]).includes(v);
}

/**
 * Reads enabled stocking provinces from localStorage.
 * Accepts a JSON array or a legacy single-province string.
 */
export function parseStoredProvinces(raw: string | null): Set<StockingProvince> {
  if (!raw) return new Set(DEFAULT_STOCKING_PROVINCES);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string" && isStockingProvince(parsed)) {
      return new Set([parsed]);
    }
    if (Array.isArray(parsed)) {
      const next = new Set<StockingProvince>();
      for (const item of parsed) {
        if (typeof item === "string" && isStockingProvince(item)) next.add(item);
      }
      if (next.size > 0) return next;
    }
  } catch {
    if (isStockingProvince(raw)) return new Set([raw]);
  }
  return new Set(DEFAULT_STOCKING_PROVINCES);
}

export function serializeProvinces(provinces: Iterable<StockingProvince>): string {
  return JSON.stringify([...provinces].sort());
}

/** Fit frame for one province, or the union of bounds when several are on. */
export function provincesMapFrame(
  provinces: Set<StockingProvince>,
): ProvinceMapFrame | null {
  if (provinces.size === 0) return null;
  if (provinces.size === 1) {
    const only = [...provinces][0];
    return only ? PROVINCE_MAP_FRAMES[only] : null;
  }

  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const code of provinces) {
    const [[swLat, swLng], [neLat, neLng]] = PROVINCE_MAP_FRAMES[code].bounds;
    minLat = Math.min(minLat, swLat);
    minLng = Math.min(minLng, swLng);
    maxLat = Math.max(maxLat, neLat);
    maxLng = Math.max(maxLng, neLng);
  }

  const maxZoom =
    provinces.has("YT") && (provinces.has("ON") || provinces.has("QC")) ? 4 : 5;

  return {
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
    maxZoom,
  };
}
