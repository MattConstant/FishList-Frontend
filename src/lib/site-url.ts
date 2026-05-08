/**
 * Single source of truth for resolving the canonical site URL across metadata + SEO routes.
 *
 * Precedence:
 * - NEXT_PUBLIC_SITE_URL (recommended; set to e.g. "https://www.fishlist.ca")
 * - VERCEL_URL (Vercel-provided hostname; we assume https)
 * - localhost fallback (dev)
 */
export function resolveSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (raw) {
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
      // fall through to localhost
    }
  }

  return new URL("http://localhost:3000");
}

export function resolveSiteOrigin(): string {
  return resolveSiteUrl().toString().replace(/\/$/, "");
}

