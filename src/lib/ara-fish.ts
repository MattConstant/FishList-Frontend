export type AraMapPoint = {
  id: number;
  lat: number;
  lng: number;
  name: string;
  species: string;
};

export type AraViewport = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export const ARA_SPECIES_FILTERS = [
  "smallmouth_bass",
  "largemouth_bass",
  "rock_bass",
  "northern_pike",
  "walleye",
  "muskellunge",
  "yellow_perch",
  "brook_trout",
  "lake_trout",
  "rainbow_trout",
  "brown_trout",
  "black_crappie",
] as const;

export type AraSpeciesFilter = (typeof ARA_SPECIES_FILTERS)[number];

/**
 * MNRF / ARA `FISH_SPECIES_SUMMARY` token names per map filter key.
 * Used client-side to match summary lines to pills; must match API `buildWhere`.
 */
export const ARA_FILTER_SUMMARY_NAMES: Record<
  AraSpeciesFilter,
  readonly string[]
> = {
  smallmouth_bass: ["Smallmouth Bass"],
  largemouth_bass: ["Largemouth Bass"],
  rock_bass: ["Rock Bass"],
  northern_pike: ["Northern Pike"],
  walleye: ["Walleye", "Yellow Pickerel"],
  muskellunge: ["Muskellunge", "Muskie"],
  yellow_perch: ["Yellow Perch"],
  brook_trout: ["Brook Trout"],
  lake_trout: ["Lake Trout"],
  rainbow_trout: ["Rainbow Trout"],
  brown_trout: ["Brown Trout"],
  black_crappie: ["Black Crappie"],
};

export function araSummaryLineMatchesFilter(
  line: string,
  key: AraSpeciesFilter,
): boolean {
  const n = line.trim().toLowerCase();
  if (!n) return false;
  for (const variant of ARA_FILTER_SUMMARY_NAMES[key]) {
    if (variant.toLowerCase() === n) return true;
  }
  return false;
}

export function araSummaryLineToFilters(line: string): AraSpeciesFilter[] {
  return ARA_SPECIES_FILTERS.filter((k) => araSummaryLineMatchesFilter(line, k));
}

export async function fetchAraInBounds(
  v: AraViewport,
  opt: { species: AraSpeciesFilter[] },
  signal?: AbortSignal,
): Promise<{ features: AraMapPoint[]; tooWide: boolean }> {
  const q = new URLSearchParams();
  q.set("south", String(v.south));
  q.set("west", String(v.west));
  q.set("north", String(v.north));
  q.set("east", String(v.east));
  q.set("species", opt.species.join(","));

  const res = await fetch(`/api/geohub/ara?${q.toString()}`, { signal });
  if (!res.ok) {
    throw new Error("ARA request failed");
  }
  const data = (await res.json()) as {
    features: AraMapPoint[];
    tooWide?: boolean;
  };
  return {
    features: data.features ?? [],
    tooWide: data.tooWide === true,
  };
}
