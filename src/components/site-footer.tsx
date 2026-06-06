"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/contexts/locale-context";

export function SiteFooter({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const onAboutPage = pathname === "/about";
  const year = new Date().getFullYear();

  return (
    <footer
      className={`shrink-0 border-t border-zinc-200/70 px-3 py-6 text-center dark:border-zinc-800 ${className}`}
      role="contentinfo"
    >
      <nav
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400"
        aria-label={t("legal.footer.navLabel")}
      >
        <Link
          href="/legal/privacy"
          className="transition hover:text-sky-700 hover:underline dark:hover:text-sky-300"
        >
          {t("legal.link.privacy")}
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
          ·
        </span>
        <Link
          href="/legal/terms"
          className="transition hover:text-sky-700 hover:underline dark:hover:text-sky-300"
        >
          {t("legal.link.terms")}
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
          ·
        </span>
        <Link
          href="/legal/data"
          className="transition hover:text-sky-700 hover:underline dark:hover:text-sky-300"
        >
          {t("legal.link.data")}
        </Link>
        {!onAboutPage && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
              ·
            </span>
            <Link
              href="/about"
              className="transition hover:text-sky-700 hover:underline dark:hover:text-sky-300"
            >
              {t("legal.footer.about")}
            </Link>
          </>
        )}
      </nav>
      <p className="mt-1.5 text-[0.65rem] text-zinc-400 dark:text-zinc-500">
        © {year} FishList
      </p>
    </footer>
  );
}
