/**
 * Format integers for display using the app's locale so SSR (Node) and the
 * browser match on hydration. Never use bare `n.toLocaleString()` in UI — it
 * follows runtime default locale and differs between server and client.
 */
export function formatAppInteger(n: number, appLocale: string): string {
  const loc = appLocale === "fr" ? "fr-CA" : "en-CA";
  return n.toLocaleString(loc);
}

/** Short date for feed cards, profile, etc. — deterministic SSR vs browser. */
export function formatAppShortDate(iso: string, appLocale: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  const loc = appLocale === "fr" ? "fr-CA" : "en-CA";
  return new Date(parsed).toLocaleDateString(loc, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
