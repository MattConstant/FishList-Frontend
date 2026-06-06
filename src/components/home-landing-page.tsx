"use client";

import en from "@/locales/en";
import fr from "@/locales/fr";
import { HomeLandingContent } from "@/components/home-landing-content";
import { useLocale } from "@/contexts/locale-context";
import type { LandingLabels } from "@/lib/landing-labels";

const dictionaries: Record<"en" | "fr", LandingLabels> = {
  en: en as LandingLabels,
  fr: fr as LandingLabels,
};

/** Client landing (non-English locale after hydration). */
export default function HomeLandingPage() {
  const { locale } = useLocale();
  return <HomeLandingContent labels={dictionaries[locale]} />;
}
