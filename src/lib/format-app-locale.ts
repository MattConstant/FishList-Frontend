/**
 * Format integers for display using the app's locale so SSR (Node) and the
 * browser match on hydration. Never use bare `n.toLocaleString()` in UI - it
 * follows runtime default locale and differs between server and client.
 */
export function formatAppInteger(n: number, appLocale: string): string {
  const loc = appLocale === "fr" ? "fr-CA" : "en-CA";
  return n.toLocaleString(loc);
}

/** Short date for feed cards, profile, etc. - deterministic SSR vs browser. */
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

/** Relative time for comments and notifications (e.g. "5m", "2h"). */
export function formatAppRelativeTime(iso: string, appLocale: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  const diffMs = Date.now() - parsed;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return appLocale === "fr" ? `${sec}s` : `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return appLocale === "fr" ? `${min} min` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return appLocale === "fr" ? `${hr} h` : `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return appLocale === "fr" ? `${day} j` : `${day}d`;
  return formatAppShortDate(iso, appLocale);
}
