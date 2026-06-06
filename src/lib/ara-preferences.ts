import {
  ARA_SPECIES_FILTERS,
  type AraSpeciesFilter,
} from "@/lib/ara-fish";

const ARA_MAP_FILTERS_KEY = "fishlist-ara-map-species-filters";
const ARA_TARGET_SPECIES_KEY = "fishlist-ara-target-species";

export function loadAraMapFilterSet(): Set<AraSpeciesFilter> {
  if (typeof window === "undefined") {
    return new Set(ARA_SPECIES_FILTERS);
  }
  try {
    const raw = localStorage.getItem(ARA_MAP_FILTERS_KEY);
    if (raw === null) return new Set(ARA_SPECIES_FILTERS);
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set(ARA_SPECIES_FILTERS);
    const allowed = new Set<string>(ARA_SPECIES_FILTERS);
    const filtered = arr.filter(
      (x): x is AraSpeciesFilter => typeof x === "string" && allowed.has(x),
    );
    return new Set(filtered);
  } catch {
    return new Set(ARA_SPECIES_FILTERS);
  }
}

export function saveAraMapFilterSet(set: Set<AraSpeciesFilter>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ARA_MAP_FILTERS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/** "Target" / favourite species for presence detail (green fish sheet). */
export function loadAraTargetSpecies(): AraSpeciesFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ARA_TARGET_SPECIES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const allowed = new Set<string>(ARA_SPECIES_FILTERS);
    return arr.filter(
      (x): x is AraSpeciesFilter => typeof x === "string" && allowed.has(x),
    );
  } catch {
    return [];
  }
}

export function saveAraTargetSpecies(keys: AraSpeciesFilter[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ARA_TARGET_SPECIES_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}
