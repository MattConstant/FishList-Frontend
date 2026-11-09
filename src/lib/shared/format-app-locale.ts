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

/** Hour:minute label in a given IANA time zone (used by forecast UI). */
export function formatZonedHourMinute(
  iso: string,
  timeZone: string,
  intlLocale: string,
): string {
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString(intlLocale);
  }
}

/** Relative time from a millisecond delta (e.g. "5m", "2h", "3d"). */
export function formatAppRelativeTimeMs(diffMs: number, appLocale: string): string {
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return appLocale === "fr" ? `${min} min` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return appLocale === "fr" ? `${hr} h` : `${hr}h`;
  const day = Math.floor(hr / 24);
  return appLocale === "fr" ? `${day} j` : `${day}d`;
}

/** Relative time for comments and notifications (e.g. "5m", "2h"); falls back to a date after a week. */
export function formatAppRelativeTime(iso: string, appLocale: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  const diffMs = Date.now() - parsed;
  if (Math.floor(Math.max(0, diffMs) / 86_400_000) >= 7) {
    return formatAppShortDate(iso, appLocale);
  }
  return formatAppRelativeTimeMs(diffMs, appLocale);
}
