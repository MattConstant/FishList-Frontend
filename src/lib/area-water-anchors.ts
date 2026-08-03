import { haversineDistanceKm } from "@/lib/geo-distance";
import type { AreaFishingWaterAnchor } from "@/lib/api";
import type { AraViewport } from "@/lib/ara-fish";

function normalizeWaterName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(lake|lac)\s+/i, "")
    .replace(/\s+(lake|lac)$/i, "");
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
