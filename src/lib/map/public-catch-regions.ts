export type PublicCatchRegion = {
  latitude: number;
  longitude: number;
  catchCount: number;
};

/** Anonymized catch pins for logged-out visitors; coords are pre-rounded by the backend. */
export async function fetchPublicCatchRegions(): Promise<PublicCatchRegion[]> {
  const res = await fetch("/api/public/catch-regions", { cache: "no-store" });
  if (!res.ok) throw new Error(`Catch regions ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (r): r is PublicCatchRegion =>
      !!r &&
      typeof r === "object" &&
      Number.isFinite((r as PublicCatchRegion).latitude) &&
      Number.isFinite((r as PublicCatchRegion).longitude) &&
      Number.isFinite((r as PublicCatchRegion).catchCount),
  );
}
