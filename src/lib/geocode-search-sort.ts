import type { GeocodeSearchHit } from "@/lib/geocode-search-types";

/** Water-related tokens in the query or in a place name (GeoNames / Open-Meteo). */
const WATER_TERMS =
  /\b(lake|lac|river|rivière|riviere|pond|bay|inlet|reservoir|réservoir|water|stream|creek|ocean|sea|sound|fjord|lagoon|channel|strait)\b/i;

/**
 * True when the typed query suggests the user wants a waterbody (not only a town).
 * If false, we rank populated places by population so cities/towns surface first.
 */
export function geocodeQueryImpliesWater(query: string): boolean {
  return WATER_TERMS.test(query.trim());
}

/** Map / pin search: Canada-first, then water vs town ranking from the query intent. */
export function sortGeocodeHitsForPinDrop(
  hits: GeocodeSearchHit[],
  query: string,
): GeocodeSearchHit[] {
  const wantsWater = geocodeQueryImpliesWater(query);
  const indexed = hits.map((h, i) => ({ h, i }));

  const score = (h: GeocodeSearchHit, originalIndex: number): number => {
    let s = 0;
    if (h.country?.toLowerCase() === "canada") s += 10_000_000;

    if (wantsWater) {
      if (WATER_TERMS.test(h.name)) s += 1_000_000;
    } else {
      s += Math.min(h.population ?? 0, 99_999_999);
    }

    s += (1_000 - Math.min(originalIndex, 999)) / 1000;
    return s;
  };

  indexed.sort((a, b) => score(b.h, b.i) - score(a.h, a.i));
  return indexed.map((x) => x.h);
}
