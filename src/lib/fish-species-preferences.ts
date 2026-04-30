/**
 * Client-side “favorite” stocking species and optional auto-filter for the map.
 */
const FAVORITE_SPECIES_KEY = "fishlist-favorite-species";
const AUTO_FILTER_KEY = "fishlist-map-auto-filter-favorite-species";

export function loadFavoriteSpecies(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITE_SPECIES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}

export function saveFavoriteSpecies(species: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITE_SPECIES_KEY, JSON.stringify(species));
  } catch {
    /* ignore quota */
  }
}

export function getAutoFilterFavoriteSpecies(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTO_FILTER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAutoFilterFavoriteSpecies(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_FILTER_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * If auto-filter is on and the user has favorite species, restrict `all` to that
 * intersection (non-empty). Otherwise return all species.
 */
export function initialActiveSpeciesFromPreferences(all: string[]): Set<string> {
  if (!getAutoFilterFavoriteSpecies()) {
    return new Set(all);
  }
  const favs = new Set(loadFavoriteSpecies());
  if (favs.size === 0) {
    return new Set(all);
  }
  const next = new Set(all.filter((s) => favs.has(s)));
  return next.size > 0 ? next : new Set(all);
}
