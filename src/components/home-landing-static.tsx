import en from "@/locales/en";
import { HomeLandingContent } from "@/components/home-landing-content";
import type { LandingLabels } from "@/lib/landing-labels";

/** Server-rendered logged-out home (first paint / LCP). */
export function HomeLandingStatic() {
  return <HomeLandingContent labels={en as LandingLabels} />;
}
