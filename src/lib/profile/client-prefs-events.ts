export const CLIENT_PREFS_UPDATED_EVENT = "fishlist-client-prefs-updated";

export function notifyClientPrefsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLIENT_PREFS_UPDATED_EVENT));
}
