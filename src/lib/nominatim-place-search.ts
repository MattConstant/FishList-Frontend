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
  if (/\b(ontario|canada|québec|quebec|alberta|manitoba|saskatchewan|british columbia|nova scotia|new brunswick|newfoundland|labrador|pei|prince edward|yukon|nunavut|northwest)\b/.test(lower)) {
    return q;
  }
  return `${q}, Canada`;
}

function isWaterHit(row: NominatimRow): boolean {
  const cls = (row.class ?? "").toLowerCase();
  const typ = (row.type ?? "").toLowerCase();
  if (cls === "waterway") return false;
  if (cls === "water") {
    if (typ.includes("river") || typ.includes("stream") || typ.includes("canal")) return false;
    return true;
  }
  if (cls === "natural" && (typ === "water" || /\b(lake|pond|bay|reservoir|wetland)\b/.test(typ))) {
    return true;
  }
  return /\b(lake|lac|pond|reservoir|waterbody)\b/i.test(
    `${row.name ?? ""} ${row.display_name}`,
  );
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

  const code = row.address?.country_code?.toLowerCase() ?? "";
  if (code && code !== "ca") return null;

  const country =
    row.address?.country ??
    (code === "ca" ? "Canada" : "");
  // Prefer explicit Canada; drop unknown-country rows that slipped past countrycodes.
  if (country && country.toLowerCase() !== "canada" && code !== "ca") return null;

  const admin1 = row.address?.state ?? null;
  const water = isWaterHit(row);

  return {
    id: -Math.abs(row.place_id),
    name: shortLabel(row),
    latitude,
    longitude,
    country: country || "Canada",
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

async function nominatimSearch(
  q: string,
  lang: "en" | "fr",
  extra?: Record<string, string>,
): Promise<NominatimRow[]> {
  const params = new URLSearchParams({
    format: "json",
    q: buildNominatimQuery(q),
    limit: "18",
    addressdetails: "1",
    countrycodes: "ca",
    ...extra,
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
  return Array.isArray(data) ? (data as NominatimRow[]) : [];
}

/** Forward place search via OSM Nominatim (lakes + towns in Canada only). */
export async function fetchNominatimPlaceHits(
  q: string,
  lang: "en" | "fr",
): Promise<GeocodeSearchHit[]> {
  const wantsWater = geocodeQueryImpliesWater(q);

  // Canada-scoped place search + an explicit "Lake/Lac …" pass so waterbodies
  // show up even when the user types only the lake name (e.g. "Nipissing").
  const searches: Promise<NominatimRow[]>[] = [nominatimSearch(q, lang)];
  if (!wantsWater) {
    const lakePrefixed = lang === "fr" ? `Lac ${q}` : `Lake ${q}`;
    searches.push(nominatimSearch(lakePrefixed, lang));
  }

  const batches = await Promise.all(searches);
  const mapped = batches
    .flat()
    .map(toHit)
    .filter((h): h is GeocodeSearchHit => h !== null);

  return dedupeHits(mapped);
}

export function mergeGeocodeHits(
  primary: GeocodeSearchHit[],
  secondary: GeocodeSearchHit[],
): GeocodeSearchHit[] {
  return dedupeHits([...primary, ...secondary]);
}
