export type PublicStatsResponse = {
  catchesLogged: number;
  lakesMapped: number;
  speciesTracked: number;
  tripsPlanned: number;
};

export const EMPTY_PUBLIC_STATS: PublicStatsResponse = {
  catchesLogged: 0,
  lakesMapped: 0,
  speciesTracked: 0,
  tripsPlanned: 0,
};

/** Client fetch for logged-out landing counters. */
export async function fetchPublicStats(): Promise<PublicStatsResponse> {
  const res = await fetch("/api/public/stats", { cache: "no-store" });
  if (!res.ok) throw new Error(`Stats ${res.status}`);
  return res.json() as Promise<PublicStatsResponse>;
}
