import { NextResponse } from "next/server";
import {
  geocodeQueryImpliesWater,
  isCanadaGeocodeHit,
} from "@/lib/geocode-search-sort";
import type { GeocodeSearchHit } from "@/lib/geocode-search-types";
import {
  fetchNominatimPlaceHits,
  mergeGeocodeHits,
} from "@/lib/nominatim-place-search";

const GEO = "https://geocoding-api.open-meteo.com/v1/search";

async function fetchOpenMeteoHits(
  q: string,
  lang: "en" | "fr",
): Promise<GeocodeSearchHit[]> {
  const url = new URL(GEO);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "20");
  url.searchParams.set("language", lang);
  // Canada only — Open-Meteo GeoNames country filter.
  url.searchParams.set("countryCode", "CA");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const raw = (await res.json()) as {
    results?: {
      id: number;
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      country_code?: string;
      admin1?: string | null;
      feature_code?: string;
      population?: number;
    }[];
  };

  return (raw.results ?? [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country || (r.country_code?.toUpperCase() === "CA" ? "Canada" : ""),
      admin1: r.admin1 ?? null,
      featureCode: r.feature_code ?? null,
      population: typeof r.population === "number" ? r.population : null,
    }))
    .filter(isCanadaGeocodeHit);
}

/** Canadian towns (Open-Meteo) + Canadian lakes/waterbodies (Nominatim). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const lang = searchParams.get("lang") === "fr" ? "fr" : "en";

  if (q.length < 2) {
    return NextResponse.json({ results: [] as GeocodeSearchHit[] });
  }
  if (q.length > 120) {
    return NextResponse.json({ error: "Query too long." }, { status: 400 });
  }

  try {
    const wantsWater = geocodeQueryImpliesWater(q);
    const [openMeteo, nominatim] = await Promise.all([
      fetchOpenMeteoHits(q, lang),
      // Always ask Nominatim so lakes appear even without typing "lake".
      fetchNominatimPlaceHits(q, lang),
    ]);

    let results = mergeGeocodeHits(openMeteo, nominatim).filter(isCanadaGeocodeHit);

    // If providers returned nothing useful for a watery query, try an explicit lake/lac pass.
    if (results.length === 0 && wantsWater) {
      results = (await fetchNominatimPlaceHits(q, lang)).filter(isCanadaGeocodeHit);
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Geocoding service unreachable." },
      { status: 502 },
    );
  }
}
