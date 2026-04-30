/**
 * Map “favorite spots” — stored locally (no account required).
 */
const STORAGE_KEY = "fishlist-map-favorite-spots";

export type FavoriteSpot = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  createdAt: number;
};

const PRECISION = 5;

function roundCoord(n: number): number {
  return Math.round(n * 10 ** PRECISION) / 10 ** PRECISION;
}

export function makeFavoriteSpotId(lat: number, lng: number): string {
  return `${roundCoord(lat)}|${roundCoord(lng)}`;
}

export function loadMapFavorites(): FavoriteSpot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (x: unknown) =>
          x != null &&
          typeof x === "object" &&
          "id" in (x as object) &&
          "lat" in (x as object) &&
          "lng" in (x as object) &&
          "label" in (x as object),
      )
      .map((x) => x as FavoriteSpot);
  } catch {
    return [];
  }
}

export function saveMapFavorites(spots: FavoriteSpot[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
  } catch {
    /* ignore quota */
  }
}

export function isFavoriteId(id: string, list: FavoriteSpot[]): boolean {
  return list.some((f) => f.id === id);
}

export function toggleMapFavorite(
  list: FavoriteSpot[],
  lat: number,
  lng: number,
  label: string,
): FavoriteSpot[] {
  const id = makeFavoriteSpotId(lat, lng);
  if (isFavoriteId(id, list)) {
    return list.filter((f) => f.id !== id);
  }
  return [
    ...list,
    {
      id,
      lat: roundCoord(lat),
      lng: roundCoord(lng),
      label: label.trim() || "Saved spot",
      createdAt: Date.now(),
    },
  ];
}

export function removeMapFavoriteById(
  list: FavoriteSpot[],
  id: string,
): FavoriteSpot[] {
  return list.filter((f) => f.id !== id);
}
