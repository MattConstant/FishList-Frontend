"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const { user, isReady, isAdmin } = useAuth();
  const { locale, setLocale, t } = useLocale();

  const linkClass = (href: string) => {
    const active = pathname === href;
    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-sky-600 text-white"
        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
    ].join(" ");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-sky-700 dark:text-sky-400"
        >
          <Image
            src="/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png"
            alt="FishList logo"
            width={28}
            height={28}
            className="rounded-md"
            priority
          />
          {t("nav.brand")}
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1 sm:gap-2">
          <Link href="/" className={linkClass("/")}>
            {t("nav.home")}
          </Link>
          <Link href="/about" className={linkClass("/about")}>
            {t("nav.about")}
          </Link>
          <Link href="/map" className={linkClass("/map")}>
            {t("nav.map")}
          </Link>
          <Link href="/friends" className={linkClass("/friends")}>
            {t("nav.friends")}
          </Link>
          {user && isAdmin && (
            <Link href="/admin" className={linkClass("/admin")}>
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700"
            aria-label={t("nav.language")}
            title={t("nav.language")}
          >
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={[
                "rounded px-1.5 py-1 text-xs font-semibold",
                locale === "en"
                  ? "bg-sky-600 text-white"
                  : "text-zinc-600 dark:text-zinc-300",
              ].join(" ")}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={[
                "rounded px-1.5 py-1 text-xs font-semibold",
                locale === "fr"
                  ? "bg-sky-600 text-white"
                  : "text-zinc-600 dark:text-zinc-300",
              ].join(" ")}
            >
              FR
            </button>
          </div>
          {isReady && !user && (
            <Link
              href="/login"
              className="rounded-lg px-2 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50 sm:px-3"
            >
              {t("nav.login")}
            </Link>
          )}
          <Link
            href="/profile"
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
              pathname === "/profile"
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-sky-500 hover:text-sky-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-sky-500 dark:hover:text-sky-300",
            ].join(" ")}
            aria-label={t("nav.profile")}
            title={t("nav.profile")}
          >
            <ProfileIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
