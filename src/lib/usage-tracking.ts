import { getApiBaseUrl, loadSession } from "@/lib/api";

/** Must stay in sync with the whitelist in UsageEventController on the backend. */
export type UsageEventType =
  | "landing_map_cta"
  | "landing_signup_cta"
  | "map_visit"
  | "map_filter_species"
  | "map_filter_district"
  | "map_filter_years"
  | "map_filter_min_fish"
  | "map_filter_min_species"
  | "map_layer"
  | "map_search"
  | "map_anon_pin"
  | "map_login_pill";

/**
 * Fire-and-forget product-usage tracking (viewed in the admin panel).
 * Never throws and never blocks the UI; failures are silently ignored.
 */
export function trackUsage(type: UsageEventType, detail?: string): void {
  if (typeof window === "undefined") return;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const session = loadSession();
    if (session) headers.Authorization = session.authorizationHeader;
    void fetch(`${getApiBaseUrl()}/api/public/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type, detail: detail ? detail.slice(0, 160) : null }),
      // keepalive lets the request finish even when the click navigates away
      keepalive: true,
    }).catch(() => {});
  } catch {
    // tracking must never break the app
  }
}
