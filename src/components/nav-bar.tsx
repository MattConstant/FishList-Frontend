"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NavLangThemeGroup } from "@/components/nav-lang-theme-group";
import { UserAvatar } from "@/components/user-avatar";
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
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pathnameForMenu, setPathnameForMenu] = useState(pathname);
  if (pathname !== pathnameForMenu) {
    setPathnameForMenu(pathname);
    setMobileMenuOpen(false);
  }

  const linkClass = (href: string) => {
    const active = pathname === href;
    return [
      "inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
      "min-h-11 min-w-[2.75rem] sm:min-h-0 sm:min-w-0",
      active
        ? "bg-sky-600 text-white"
        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
    ].join(" ");
  };

  const linkClassMobile = (href: string) => {
    const active = pathname === href;
    return [
      "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-sky-600 text-white"
        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
    ].join(" ");
  };

  const navLinks = (
    <>
      <Link href="/" className={linkClass("/")} onClick={() => setMobileMenuOpen(false)}>
        {t("nav.home")}
      </Link>
      <Link href="/map" className={linkClass("/map")} onClick={() => setMobileMenuOpen(false)}>
        {t("nav.map")}
      </Link>
      <Link href="/friends" className={linkClass("/friends")} onClick={() => setMobileMenuOpen(false)}>
        {t("nav.friends")}
      </Link>
      <Link href="/about" className={linkClass("/about")} onClick={() => setMobileMenuOpen(false)}>
        {t("nav.about")}
      </Link>
      {user && isAdmin && (
        <Link href="/admin" className={linkClass("/admin")} onClick={() => setMobileMenuOpen(false)}>
          {t("nav.admin")}
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-zinc-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-2 px-3 py-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:px-4">
        <Link
          href="/"
          className="inline-flex min-w-0 shrink items-center gap-1.5 text-base font-semibold tracking-tight text-sky-700 sm:gap-2 sm:text-lg dark:text-sky-400"
        >
          <Image
            src="/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png"
            alt="FishList logo"
            width={28}
            height={28}
            className="shrink-0 rounded-md"
            priority
          />
          <span className="truncate max-[340px]:hidden">{t("nav.brand")}</span>
        </Link>

        <nav
          className="hide-scrollbar mx-2 hidden min-w-0 flex-1 touch-manipulation items-center justify-center gap-1 overflow-x-auto whitespace-nowrap md:flex md:gap-2"
          aria-label={t("nav.ariaMainNav")}
        >
          {navLinks}
        </nav>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2.5">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 active:bg-zinc-200/80 md:hidden dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700/80"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <NavLangThemeGroup />

          {isReady && !user && (
            <Link
              href="/login"
              className="touch-manipulation rounded-lg px-2 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 active:bg-sky-100/80 dark:text-sky-400 dark:hover:bg-sky-950/50 dark:active:bg-sky-950 sm:px-3"
            >
              {t("nav.login")}
            </Link>
          )}
          <Link
            href="/profile"
            className={[
              "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border transition-colors active:opacity-90 sm:h-10 sm:w-10",
              pathname === "/profile"
                ? user
                  ? "overflow-hidden border-sky-500 p-0 ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:border-sky-400 dark:ring-sky-400 dark:ring-offset-zinc-950"
                  : "border-sky-600 bg-sky-600 text-white"
                : user
                  ? "overflow-hidden border-zinc-300 p-0 hover:border-sky-500 dark:border-zinc-600 dark:hover:border-sky-500"
                  : "border-zinc-300 text-zinc-600 hover:border-sky-500 hover:text-sky-700 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-sky-500 dark:hover:text-sky-300",
            ].join(" ")}
            aria-label={t("nav.profile")}
            title={t("nav.profile")}
          >
            {user ? (
              <UserAvatar
                accountId={user.id}
                profileImageKey={user.profileImageKey}
                size="md"
                label={t("nav.profile")}
                className="!ring-0"
                loadWhenVisible={false}
              />
            ) : (
              <ProfileIcon className="h-5 w-5" />
            )}
          </Link>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-nav-menu"
          className="border-t border-zinc-200 bg-white px-3 py-2 shadow-inner dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
        >
          <nav
            className="flex max-h-[min(70vh,24rem)] flex-col gap-0.5 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
            aria-label={t("nav.ariaMainNav")}
          >
            <Link href="/" className={linkClassMobile("/")} onClick={() => setMobileMenuOpen(false)}>
              {t("nav.home")}
            </Link>
            <Link href="/map" className={linkClassMobile("/map")} onClick={() => setMobileMenuOpen(false)}>
              {t("nav.map")}
            </Link>
            <Link href="/friends" className={linkClassMobile("/friends")} onClick={() => setMobileMenuOpen(false)}>
              {t("nav.friends")}
            </Link>
            <Link href="/about" className={linkClassMobile("/about")} onClick={() => setMobileMenuOpen(false)}>
              {t("nav.about")}
            </Link>
            {user && isAdmin && (
              <Link href="/admin" className={linkClassMobile("/admin")} onClick={() => setMobileMenuOpen(false)}>
                {t("nav.admin")}
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
