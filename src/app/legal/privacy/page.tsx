"use client";

import { LegalDocument } from "@/components/legal-document";

const SECTIONS = [
  { titleKey: "legal.privacy.s1t", bodyKey: "legal.privacy.s1b" },
  { titleKey: "legal.privacy.s2t", bodyKey: "legal.privacy.s2b" },
  { titleKey: "legal.privacy.s3t", bodyKey: "legal.privacy.s3b" },
  { titleKey: "legal.privacy.s4t", bodyKey: "legal.privacy.s4b" },
  { titleKey: "legal.privacy.s5t", bodyKey: "legal.privacy.s5b" },
  { titleKey: "legal.privacy.s6t", bodyKey: "legal.privacy.s6b" },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      titleKey="legal.privacy.title"
      updatedKey="legal.privacy.updated"
      sectionKeys={[...SECTIONS]}
    />
  );
}
