import type { GeocodeSearchHit } from "@/lib/geocode-search-types";

/** Water-related tokens in the query or in a place name (GeoNames / Open-Meteo). */
const WATER_TERMS =
  /\b(lake|lac|river|rivière|riviere|pond|bay|inlet|reservoir|réservoir|water|stream|creek|ocean|sea|sound|fjord|lagoon|channel|strait)\b/i;

/**
 * True when the typed query suggests the user wants a waterbody (not only a town).
 */
export function geocodeQueryImpliesWater(query: string): boolean {
  return WATER_TERMS.test(query.trim());
}

export function isCanadaGeocodeHit(h: GeocodeSearchHit): boolean {
  const c = (h.country ?? "").trim().toLowerCase();
  return c === "canada" || c === "ca";
}

function isWaterHit(h: GeocodeSearchHit): boolean {
  if (h.featureCode === "H.LK" || h.featureCode === "LK") return true;
  return WATER_TERMS.test(h.name);
}

function isSettlementCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return code.startsWith("PPL") || code === "PPLA" || code === "PPLC" || code === "PPLX";
}

/** Map / pin search: Canada-only, lakes boosted (fishing map), towns by population. */
export function sortGeocodeHitsForPinDrop(
  hits: GeocodeSearchHit[],
  query: string,
): GeocodeSearchHit[] {
  const wantsWater = geocodeQueryImpliesWater(query);
  const canada = hits.filter(isCanadaGeocodeHit);
  const indexed = canada.map((h, i) => ({ h, i }));

  const score = (h: GeocodeSearchHit, originalIndex: number): number => {
    let s = 0;
    const water = isWaterHit(h);

    if (water) {
      // Always surface lakes on this map; stronger when the query looks watery.
      s += wantsWater ? 12_000_000 : 4_000_000;
      if (h.featureCode === "H.LK" || h.featureCode === "LK") s += 1_000_000;
      if (WATER_TERMS.test(h.name)) s += 500_000;
    } else if (isSettlementCode(h.featureCode)) {
      s += Math.min(h.population ?? 0, 8_000_000);
      if (!wantsWater) s += 500_000;
    } else {
      s += Math.min(h.population ?? 0, 2_000_000);
    }

    // Prefer closer name matches lightly via original provider order.
    s += (1_000 - Math.min(originalIndex, 999)) / 1000;
    return s;
  };

  indexed.sort((a, b) => score(b.h, b.i) - score(a.h, a.i));
  return indexed.map((x) => x.h);
}
