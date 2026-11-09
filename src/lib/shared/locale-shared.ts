export const LOCALE_STORAGE_KEY = "fishlist-locale";
export const LOCALE_COOKIE_NAME = "fishlist-locale";

export type AppLocale = "en" | "fr";

export function parseAppLocale(value: string | null | undefined): AppLocale {
  return value === "fr" ? "fr" : "en";
}

/** Persist locale for SSR (read in server components via cookies()). */
export function writeLocaleCookie(locale: AppLocale) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=${maxAge};samesite=lax`;
}
