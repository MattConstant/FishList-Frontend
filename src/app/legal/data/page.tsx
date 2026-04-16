"use client";

import { LegalDocument } from "@/components/legal-document";

const SECTIONS = [
  { titleKey: "legal.data.s1t", bodyKey: "legal.data.s1b" },
  { titleKey: "legal.data.s2t", bodyKey: "legal.data.s2b" },
  { titleKey: "legal.data.s3t", bodyKey: "legal.data.s3b" },
  { titleKey: "legal.data.s4t", bodyKey: "legal.data.s4b" },
  { titleKey: "legal.data.s5t", bodyKey: "legal.data.s5b" },
] as const;

export default function DataCompliancePage() {
  return (
    <LegalDocument
      titleKey="legal.data.title"
      updatedKey="legal.data.updated"
      sectionKeys={[...SECTIONS]}
    />
  );
}
