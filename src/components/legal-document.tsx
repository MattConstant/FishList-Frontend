"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/locale-context";

export type LegalSectionKey = { titleKey: string; bodyKey: string };

export function LegalDocument({
  titleKey,
  updatedKey,
  sectionKeys,
}: {
  titleKey: string;
  updatedKey: string;
  sectionKeys: LegalSectionKey[];
}) {
  const { t } = useLocale();

  return (
    <article className="text-zinc-800 dark:text-zinc-200">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t(titleKey)}
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t(updatedKey)}</p>
      <div className="mt-8 space-y-8">
        {sectionKeys.map((s, i) => (
          <section key={`${i}-${s.titleKey}`}>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t(s.titleKey)}
            </h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {t(s.bodyKey)
                .split("\n\n")
                .map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
            </div>
          </section>
        ))}
      </div>
      <nav
        className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-700"
        aria-label={t("legal.nav.label")}
      >
        <Link
          href="/about"
          className="font-medium text-sky-600 transition hover:underline dark:text-sky-400"
        >
          {t("legal.nav.backAbout")}
        </Link>
        <Link
          href="/"
          className="font-medium text-sky-600 transition hover:underline dark:text-sky-400"
        >
          {t("legal.nav.backHome")}
        </Link>
      </nav>
    </article>
  );
}
