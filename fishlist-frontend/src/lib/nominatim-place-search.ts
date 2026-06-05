import type { GeocodeSearchHit } from "@/lib/geocode-search-types";
import { geocodeQueryImpliesWater } from "@/lib/geocode-search-sort";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "FishList/1.0 (https://openstreetmap.org; place search)";

type NominatimRow = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: {
    state?: string;
    country?: string;
    country_code?: string;
  };
};

function buildNominatimQuery(q: string): string {
  const lower = q.toLowerCase();
  if (/\b(ontario|canada)\b/.test(lower)) return q;
  return `${q}, Ontario, Canada`;
}

function isWaterHit(row: NominatimRow): boolean {
  const cls = (row.class ?? "").toLowerCase();
  const typ = (row.type ?? "").toLowerCase();
  if (cls === "water") return !typ.includes("river");
  if (cls === "natural" && (typ === "water" || /\b(lake|pond|bay|reservoir)\b/.test(typ))) {
    return true;
  }
  return /\b(lake|lac|pond|reservoir|waterbody)\b/i.test(row.display_name);
}

function shortLabel(row: NominatimRow): string {
  if (row.name?.trim()) return row.name.trim();
  const first = row.display_name.split(",")[0]?.trim();
  return first || row.display_name;
}

function toHit(row: NominatimRow): GeocodeSearchHit | null {
  const latitude = Number.parseFloat(row.lat);
  const longitude = Number.parseFloat(row.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const country =
    row.address?.country ??
    (row.address?.country_code?.toLowerCase() === "ca" ? "Canada" : "");
  const admin1 = row.address?.state ?? null;
  const water = isWaterHit(row);

  return {
    id: -Math.abs(row.place_id),
    name: shortLabel(row),
    latitude,
    longitude,
    country,
    admin1,
    featureCode: water ? "H.LK" : null,
    population: water ? null : Math.round((row.importance ?? 0) * 100_000),
  };
}

function dedupeHits(hits: GeocodeSearchHit[]): GeocodeSearchHit[] {
  const seen = new Set<string>();
  const out: GeocodeSearchHit[] = [];
  for (const h of hits) {
    const key = `${h.latitude.toFixed(4)}:${h.longitude.toFixed(4)}:${h.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

/** Forward place search via OSM Nominatim (lakes, rivers, towns in Canada). */
export async function fetchNominatimPlaceHits(
  q: string,
  lang: "en" | "fr",
): Promise<GeocodeSearchHit[]> {
  const params = new URLSearchParams({
    format: "json",
    q: buildNominatimQuery(q),
    limit: "18",
    addressdetails: "1",
    countrycodes: "ca",
  });

  const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": lang,
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  const wantsWater = geocodeQueryImpliesWater(q);
  const mapped = (data as NominatimRow[])
    .map(toHit)
    .filter((h): h is GeocodeSearchHit => h !== null);

  if (!wantsWater) return dedupeHits(mapped);

  const waterOnly = mapped.filter(
    (h) => h.featureCode === "H.LK" || /\b(lake|lac|pond|reservoir|bay)\b/i.test(h.name),
  );
  return dedupeHits(waterOnly.length > 0 ? waterOnly : mapped);
}

export function mergeGeocodeHits(
  primary: GeocodeSearchHit[],
  secondary: GeocodeSearchHit[],
): GeocodeSearchHit[] {
  return dedupeHits([...primary, ...secondary]);
}
