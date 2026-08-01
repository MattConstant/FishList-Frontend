import { NextResponse } from "next/server";
import { backendFetch, getApiBaseUrl } from "@/lib/api";

/** Anonymized public catch regions; cached at the edge for 5 minutes. */
export const revalidate = 300;

export async function GET() {
  try {
    const base = getApiBaseUrl();
    const res = await backendFetch(`${base}/api/public/catch-regions`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("[public/catch-regions]", e);
    return NextResponse.json([], { status: 200 });
  }
}
