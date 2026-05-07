import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Prevents arbitrary-large POST abuse against your backend proxy. */
const MAX_BODY_BYTES = 64 * 1024;

const DEFAULT_PRODUCTION_API_BASE = "https://fishlist-backend.onrender.com";

function backendBase(): string {
  const fromEnv =
    process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return DEFAULT_PRODUCTION_API_BASE;
  return "http://localhost:8080";
}

/**
 * Proxies lake AI requests to the Spring API so the browser can POST same-origin
 * (avoids 404 when NEXT_PUBLIC_API_BASE_URL points at the Next app, and keeps JWT server-forwarded).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.trim()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { message: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  const declaredLen = req.headers.get("content-length");
  if (declaredLen !== null && Number(declaredLen) > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Payload too large" }, { status: 413 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Payload too large" }, { status: 413 });
  }

  try {
    JSON.parse(body);
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const target = `${backendBase()}/api/ai/lake-fishing-insights`;
  const res = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body,
  });

  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "application/json";
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": ct },
  });
}
