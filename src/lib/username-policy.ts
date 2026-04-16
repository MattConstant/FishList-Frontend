/**
 * Client-side username checks (preview before API). Keep banned substring list aligned with
 * {@code FishList/.../UsernamePolicy.java} DEFAULT_BANNED_SUBSTRINGS.
 *
 * Set NEXT_PUBLIC_RESERVED_USERNAMES to the same comma-separated names as ADMIN_USERNAME on the API
 * so reserved admin names are rejected in the UI (server still enforces).
 */

import { ApiHttpError } from "@/lib/api";

/** Mirrors backend UsernamePolicy.DEFAULT_BANNED_SUBSTRINGS (keep in sync). */
export const USERNAME_DEFAULT_BANNED_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigg",
  "fagg",
  "rape",
  "pedo",
  "porn",
  "slut",
  "whore",
  "cock",
  "dick",
  "anus",
  "tard",
  "coon",
  "spic",
  "chink",
  "dyke",
  "homo",
  "jizz",
  "puss",
  "scum",
  "twat",
  "wank",
] as const;

function reservedAdminNamesLowercase(): string[] {
  const raw = process.env.NEXT_PUBLIC_RESERVED_USERNAMES?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type UsernameClientIssue = "reserved" | "inappropriate";

/**
 * Returns an issue code if invalid, or null if OK for client preview.
 * Does not replace server validation.
 */
export function validateUsernameClient(
  proposed: string,
  currentUsername?: string | null,
): UsernameClientIssue | null {
  const trimmed = proposed.trim();
  if (currentUsername && trimmed.toLowerCase() === currentUsername.trim().toLowerCase()) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  for (const r of reservedAdminNamesLowercase()) {
    if (lower === r) return "reserved";
  }
  for (const frag of USERNAME_DEFAULT_BANNED_SUBSTRINGS) {
    if (lower.includes(frag)) return "inappropriate";
  }
  return null;
}

/** Maps API USERNAME_* machine messages from PATCH /accounts/me to locale-backed strings. */
export function tryMapUsernameHttpError(
  err: unknown,
  t: (key: string) => string,
): string | null {
  if (err instanceof ApiHttpError && err.status === 400) {
    if (err.message === "USERNAME_RESERVED") return t("validation.usernameReserved");
    if (err.message === "USERNAME_INAPPROPRIATE") return t("validation.usernameInappropriate");
  }
  return null;
}
