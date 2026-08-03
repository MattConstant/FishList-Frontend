import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

function backendBase(): string {
  const internal = process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, "");
  return internal || getApiBaseUrl();
}

/**
 * Proxies area AI spot requests to Spring (same pattern as lake-fishing-insights).
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

  const target = `${backendBase()}/api/ai/area-fishing-spots`;
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
