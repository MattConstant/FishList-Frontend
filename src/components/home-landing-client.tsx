"use client";

import en from "@/locales/en";
import fr from "@/locales/fr";
import { HomeLandingContent } from "@/components/home-landing-content";
import { useLocale } from "@/contexts/locale-context";
import type { LandingLabels } from "@/lib/landing-labels";
import type { PublicStatsResponse } from "@/lib/public-stats";

const dictionaries: Record<"en" | "fr", LandingLabels> = {
  en: en as LandingLabels,
  fr: fr as LandingLabels,
};

type Props = {
  initialStats: PublicStatsResponse;
};

/** Client shell so locale toggles update landing copy without a second page tree. */
export function HomeLandingClient({ initialStats }: Props) {
  const { locale } = useLocale();
  return <HomeLandingContent labels={dictionaries[locale]} initialStats={initialStats} />;
}
