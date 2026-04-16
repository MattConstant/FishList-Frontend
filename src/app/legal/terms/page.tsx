"use client";

import { LegalDocument } from "@/components/legal-document";

const SECTIONS = [
  { titleKey: "legal.terms.s1t", bodyKey: "legal.terms.s1b" },
  { titleKey: "legal.terms.s2t", bodyKey: "legal.terms.s2b" },
  { titleKey: "legal.terms.s3t", bodyKey: "legal.terms.s3b" },
  { titleKey: "legal.terms.s4t", bodyKey: "legal.terms.s4b" },
  { titleKey: "legal.terms.s5t", bodyKey: "legal.terms.s5b" },
  { titleKey: "legal.terms.s6t", bodyKey: "legal.terms.s6b" },
  { titleKey: "legal.terms.s7t", bodyKey: "legal.terms.s7b" },
] as const;

export default function TermsOfUsePage() {
  return (
    <LegalDocument
      titleKey="legal.terms.title"
      updatedKey="legal.terms.updated"
      sectionKeys={[...SECTIONS]}
    />
  );
}
