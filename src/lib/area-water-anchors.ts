import { haversineDistanceKm } from "@/lib/geo-distance";
import type { AreaFishingWaterAnchor } from "@/lib/api";
import {
  ARA_FILTER_SUMMARY_NAMES,
  type AraMapPoint,
  type AraViewport,
} from "@/lib/ara-fish";
import type { WaterbodyGroup } from "@/lib/geohub";

function normalizeWaterName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(lake|lac)\s+/i, "")
    .replace(/\s+(lake|lac)$/i, "");
}

const MATCH_ANCHOR_KM = 3;

function nearPrimaryAnchors(
  lat: number,
  lng: number,
  name: string,
  anchors: AreaFishingWaterAnchor[],
): boolean {
  const n = normalizeWaterName(name);
  for (const a of anchors) {
    if (n && normalizeWaterName(a.name) === n && n.length >= 3) return true;
    if (haversineDistanceKm(lat, lng, a.lat, a.lng) <= MATCH_ANCHOR_KM) return true;
  }
  return false;
}

function displayNameForAraToken(token: string): string {
  const t = token.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  for (const names of Object.values(ARA_FILTER_SUMMARY_NAMES)) {
    for (const variant of names) {
      if (variant.toLowerCase() === lower) return variant;
    }
  }
  return t.replace(/\s+/g, " ");
}

/**
 * Confirmed species for the primary-lake cluster from stocking groups + ARA presence.
 */
export function collectKnownSpeciesForAnchors(
  anchors: AreaFishingWaterAnchor[],
  groups: WaterbodyGroup[],
  araPoints: AraMapPoint[],
): string[] {
  if (anchors.length === 0) return [];

  const found = new Map<string, string>();
  const add = (raw: string) => {
    const name = displayNameForAraToken(raw);
    if (!name || name.length > 60) return;
    const key = name.toLowerCase();
    if (!found.has(key)) found.set(key, name);
  };

  for (const g of groups) {
    if (!nearPrimaryAnchors(g.lat, g.lng, g.waterbody, anchors)) continue;
    for (const s of g.speciesSet) add(s);
  }

  for (const a of araPoints) {
    if (!nearPrimaryAnchors(a.lat, a.lng, a.name, anchors)) continue;
    for (const part of a.species.split(/[,;|/]+/)) add(part);
  }

  return Array.from(found.values()).sort((x, y) => x.localeCompare(y));
}

/**
 * From all water pins in a selection box, keep the cluster that looks like the
 * main lake (dense + near center) so AI doesn't pick small ponds around the edge.
 */
export function selectPrimaryWaterAnchors(
  candidates: AreaFishingWaterAnchor[],
  bounds: AraViewport,
  maxKeep = 18,
): AreaFishingWaterAnchor[] {
  if (candidates.length === 0) return [];

  const cLat = (bounds.south + bounds.north) / 2;
  const cLng = (bounds.west + bounds.east) / 2;
  const latSpan = Math.max(bounds.north - bounds.south, 1e-9);
  const lngSpan = Math.max(bounds.east - bounds.west, 1e-9);

  // Prefer pins in the inner ~70% of the box (the lake the user framed).
  const inner = candidates.filter((a) => {
    const u = (a.lat - bounds.south) / latSpan;
    const v = (a.lng - bounds.west) / lngSpan;
    return u >= 0.15 && u <= 0.85 && v >= 0.15 && v <= 0.85;
  });
  const pool = inner.length >= 3 ? inner : candidates;

  const neighborKm = 2.5;
  const scored = pool.map((a) => {
    let density = 0;
    for (const o of pool) {
      if (haversineDistanceKm(a.lat, a.lng, o.lat, o.lng) <= neighborKm) density += 1;
    }
    const distKm = haversineDistanceKm(a.lat, a.lng, cLat, cLng);
    // Dense clusters near the center beat sparse edge ponds.
    const score = density / (1 + distKm);
    return { a, density, distKm, score };
  });
  scored.sort((x, y) => y.score - x.score || x.distKm - y.distKm);
  const seed = scored[0]!;

  const boxKm = Math.max(
    haversineDistanceKm(bounds.south, cLng, bounds.north, cLng),
    haversineDistanceKm(cLat, bounds.west, cLat, bounds.east),
  );
  const clusterKm = Math.min(12, Math.max(3, boxKm * 0.45));
  const seedName = normalizeWaterName(seed.a.name);

  let cluster = scored
    .map((s) => s.a)
    .filter((a) => {
      const sameName =
        !!seedName && normalizeWaterName(a.name) === seedName && seedName.length >= 3;
      const near = haversineDistanceKm(a.lat, a.lng, seed.a.lat, seed.a.lng) <= clusterKm;
      return sameName || near;
    });

  const sameNameOnly = seedName
    ? cluster.filter((a) => normalizeWaterName(a.name) === seedName)
    : [];
  // Only tighten to same name when we still have enough pins.
  if (sameNameOnly.length >= 3) {
    cluster = sameNameOnly;
  }

  // If clustering was too aggressive, fall back to nearest-to-center pins.
  if (cluster.length < 1) {
    cluster = [...pool].sort(
      (a, b) =>
        haversineDistanceKm(a.lat, a.lng, cLat, cLng) -
        haversineDistanceKm(b.lat, b.lng, cLat, cLng),
    );
  } else {
    cluster.sort(
      (a, b) =>
        haversineDistanceKm(a.lat, a.lng, cLat, cLng) -
        haversineDistanceKm(b.lat, b.lng, cLat, cLng),
    );
  }

  return cluster.slice(0, maxKeep);
}
