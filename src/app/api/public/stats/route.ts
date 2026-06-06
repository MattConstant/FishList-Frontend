import { NextResponse } from "next/server";
import { loadPublicStats } from "@/lib/public-stats-server";

/** GeoHub + backend counts; cached at the edge for 5 minutes. */
export const revalidate = 300;

/** Cached platform stats for the marketing home page. */
export async function GET() {
  try {
    const merged = await loadPublicStats();

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
