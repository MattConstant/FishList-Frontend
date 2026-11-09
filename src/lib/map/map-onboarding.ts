const MAP_ONBOARDING_SEEN_KEY = "fishlist-map-onboarding-v1-seen";

export function hasSeenMapOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(MAP_ONBOARDING_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markMapOnboardingSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MAP_ONBOARDING_SEEN_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
}
