import { NextResponse } from "next/server";
import { backendFetch, getApiBaseUrl, type AdminSummaryResponse } from "@/lib/api";
import { fetchAllStockingRecords, groupByWaterbody } from "@/lib/geohub";
import type { PublicStatsResponse } from "@/lib/public-stats";

/** GeoHub + backend counts; cached at the edge for 5 minutes. */
export const revalidate = 300;

async function geohubStats(): Promise<Pick<PublicStatsResponse, "lakesMapped" | "speciesTracked">> {
  const records = await fetchAllStockingRecords(5);
  const groups = groupByWaterbody(records);
  const species = new Set(records.map((r) => r.species.trim()).filter(Boolean));
  return {
    lakesMapped: groups.length,
    speciesTracked: species.size,
  };
}

function parsePublicStatsPayload(data: unknown): Partial<PublicStatsResponse> | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const catchesLogged = Number(row.catchesLogged);
  if (!Number.isFinite(catchesLogged)) return null;
  return {
    catchesLogged,
    lakesMapped: Number(row.lakesMapped) || 0,
    speciesTracked: Number(row.speciesTracked) || 0,
    tripsPlanned: Number(row.tripsPlanned) || 0,
  };
}

async function backendPublicStats(): Promise<Partial<PublicStatsResponse> | null> {
  const base = getApiBaseUrl();
  try {
    const res = await backendFetch(`${base}/api/public/stats`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return parsePublicStatsPayload(await res.json());
  } catch {
    return null;
  }
}

async function backendAdminStats(): Promise<Partial<PublicStatsResponse> | null> {
  const bearer = process.env.FISHLIST_PUBLIC_STATS_BEARER?.trim();
  if (!bearer) return null;
  const base = getApiBaseUrl();
  try {
    const res = await backendFetch(`${base}/api/admin/summary`, {
      headers: {
        Accept: "application/json",
        Authorization: bearer.startsWith("Bearer ") ? bearer : `Bearer ${bearer}`,
      },
    });
    if (!res.ok) return null;
    const s = (await res.json()) as AdminSummaryResponse;
    return {
      catchesLogged: s.totalCatches,
      lakesMapped: s.totalLocations,
      tripsPlanned: s.totalAccounts,
    };
  } catch {
    return null;
  }
}

async function backendAdminStatsViaLogin(): Promise<Partial<PublicStatsResponse> | null> {
  const username = process.env.FISHLIST_STATS_USERNAME?.trim();
  const password = process.env.FISHLIST_STATS_PASSWORD;
  if (!username || !password) return null;
  const base = getApiBaseUrl();
  try {
    const loginRes = await backendFetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!loginRes.ok) return null;
    const auth = (await loginRes.json()) as { accessToken?: string; tokenType?: string };
    if (!auth.accessToken) return null;
    const authorization = `${auth.tokenType ?? "Bearer"} ${auth.accessToken}`;
    const summaryRes = await backendFetch(`${base}/api/admin/summary`, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
    if (!summaryRes.ok) return null;
    const s = (await summaryRes.json()) as AdminSummaryResponse;
    return {
      catchesLogged: s.totalCatches,
      lakesMapped: s.totalLocations,
      tripsPlanned: s.totalAccounts,
    };
  } catch {
    return null;
  }
}

/** Cached platform stats for the marketing home page. */
export async function GET() {
  try {
    const [geo, pub, admin, adminLogin] = await Promise.all([
      geohubStats(),
      backendPublicStats(),
      backendAdminStats(),
      backendAdminStatsViaLogin(),
    ]);

    const backend = pub ?? admin ?? adminLogin;

    const merged: PublicStatsResponse = {
      catchesLogged: backend?.catchesLogged ?? 0,
      lakesMapped: Math.max(
        geo.lakesMapped,
        pub?.lakesMapped ?? 0,
        admin?.lakesMapped ?? 0,
      ),
      speciesTracked: Math.max(geo.speciesTracked, pub?.speciesTracked ?? 0),
      tripsPlanned: backend?.tripsPlanned ?? 0,
    };

    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("[public/stats]", e);
    return NextResponse.json(
      { error: "Could not load stats" },
      { status: 500 },
    );
  }
}
