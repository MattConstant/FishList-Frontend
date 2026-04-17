/**
 * Ontario GeoHub — Fish Stocking Data for Recreational Purposes.
 *
 * ArcGIS REST endpoint returning point features for every lake stocked
 * by MNRF in the last decade. We filter to the last 5 years client-side
 * via the `where` clause and paginate in chunks of 1 000 (the server max).
 */

const FEATURE_SERVER =
  "https://services1.arcgis.com/TJH5KDher0W13Kgo/arcgis/rest/services/" +
  "FishStockingDataForRecreationalPurposes/FeatureServer/0/query";

const PAGE_SIZE = 1000;
const EXCLUDED_SPECIES = new Set(["bluegill", "aurora trout"]);

const FIELDS = [
  "ObjectId",
  "Official_Waterbody_Name",
  "MNRF_District",
  "Developmental_Stage",
  "Species",
  "Stocking_Year",
  "Number_of_Fish_Stocked",
  "Latitude",
  "Longitude",
] as const;

export type StockingRecord = {
  objectId: number;
  waterbody: string;
  district: string;
  developmentalStage: string;
  species: string;
  year: number;
  count: number;
  lat: number;
  lng: number;
};

export type WaterbodyGroup = {
  waterbody: string;
  lat: number;
  lng: number;
  records: {
    species: string;
    year: number;
    count: number;
  }[];
  totalFish: number;
  speciesSet: Set<string>;
  districtSet: Set<string>;
  developmentalStageSet: Set<string>;
};

/** Stable id for a stocking marker (matches internal grouping key). */
export function waterbodyGroupKey(g: WaterbodyGroup): string {
  return `${g.waterbody}|${g.lat.toFixed(6)},${g.lng.toFixed(6)}`;
}

type ArcGISResponse = {
  exceededTransferLimit?: boolean;
  features: {
    attributes: {
      ObjectId: number;
      Official_Waterbody_Name: string | null;
      MNRF_District: string | null;
      Developmental_Stage: string | null;
      Species: string | null;
      Stocking_Year: number;
      Number_of_Fish_Stocked: number | null;
      Latitude: number | null;
      Longitude: number | null;
    };
  }[];
};

function buildUrl(offset: number, minYear: number): string {
  const params = new URLSearchParams({
    where: `Stocking_Year>=${minYear}`,
    outFields: FIELDS.join(","),
    returnGeometry: "false",
    orderByFields: "ObjectId",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
    f: "json",
  });
  return `${FEATURE_SERVER}?${params}`;
}

function isExcludedSpecies(species: string): boolean {
  const normalized = species.trim().toLowerCase();
  return (
    EXCLUDED_SPECIES.has(normalized) ||
    normalized.startsWith("aurora trout")
  );
}

/** Locale-aware alphabetical order for display lists (case-insensitive base letters). */
export function compareLocaleStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/**
 * Fetches all stocking records from the last `years` years.
 * Paginates automatically (1 000 records/page).
 */
export async function fetchAllStockingRecords(
  years = 5,
  onProgress?: (loaded: number) => void,
): Promise<StockingRecord[]> {
  const minYear = new Date().getFullYear() - years;
  const all: StockingRecord[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(buildUrl(offset, minYear));
    if (!res.ok) throw new Error(`GeoHub responded ${res.status}`);
    const data: ArcGISResponse = await res.json();

    for (const f of data.features) {
      const a = f.attributes;
      if (a.Latitude == null || a.Longitude == null) continue;
      const species = (a.Species ?? "Unknown").trim();
      if (isExcludedSpecies(species)) continue;
      all.push({
        objectId: a.ObjectId,
        waterbody: a.Official_Waterbody_Name ?? "Unknown",
        district: a.MNRF_District ?? "Unknown District",
        developmentalStage: a.Developmental_Stage ?? "Unknown Stage",
        species,
        year: a.Stocking_Year,
        count: a.Number_of_Fish_Stocked ?? 0,
        lat: a.Latitude,
        lng: a.Longitude,
      });
    }

    onProgress?.(all.length);
    hasMore = data.exceededTransferLimit === true;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Groups raw records by waterbody + near-exact coordinate.
 * Uses 6 decimal places to avoid visible marker drift from aggressive rounding.
 */
export function groupByWaterbody(records: StockingRecord[]): WaterbodyGroup[] {
  const map = new Map<string, WaterbodyGroup>();

  for (const r of records) {
    const key = `${r.waterbody}|${r.lat.toFixed(6)},${r.lng.toFixed(6)}`;
    let group = map.get(key);
    if (!group) {
      group = {
        waterbody: r.waterbody,
        lat: r.lat,
        lng: r.lng,
        records: [],
        totalFish: 0,
        speciesSet: new Set(),
        districtSet: new Set(),
        developmentalStageSet: new Set(),
      };
      map.set(key, group);
    }
    group.records.push({ species: r.species, year: r.year, count: r.count });
    group.totalFish += r.count;
    group.speciesSet.add(r.species);
    group.districtSet.add(r.district);
    group.developmentalStageSet.add(r.developmentalStage);
  }

  return Array.from(map.values());
}

/**
 * Returns the distinct set of species across all records.
 */
export function allSpecies(records: StockingRecord[]): string[] {
  return [...new Set(records.map((r) => r.species))]
    .filter((species) => !isExcludedSpecies(species))
    .sort(compareLocaleStrings);
}

/**
 * Returns distinct MNRF districts across records.
 */
export function allDistricts(records: StockingRecord[]): string[] {
  return [...new Set(records.map((r) => r.district))].sort(
    compareLocaleStrings,
  );
}

/**
 * Returns distinct developmental stages across records.
 */
export function allDevelopmentalStages(records: StockingRecord[]): string[] {
  return [...new Set(records.map((r) => r.developmentalStage))].sort(
    compareLocaleStrings,
  );
}
