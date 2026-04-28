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
