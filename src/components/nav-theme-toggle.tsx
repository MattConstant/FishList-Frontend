"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useLocale } from "@/contexts/locale-context";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <path
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      />
    </svg>
  );
}

type NavThemeToggleProps = {
  /** Icon button in the header bar, or a full-width row in the mobile menu. */
  variant?: "icon" | "menu-row";
};

/** Toggle light / dark theme. */
export function NavThemeToggle({ variant = "icon" }: NavThemeToggleProps) {
  const { t } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = hydrated && resolvedTheme === "dark";
  const label = isDark ? t("nav.useLightMode") : t("nav.useDarkMode");

  const icon = !hydrated ? (
    <MoonIcon className="h-4 w-4 opacity-50" />
  ) : isDark ? (
    <SunIcon className="h-4 w-4" />
  ) : (
    <MoonIcon className="h-4 w-4" />
  );

  if (variant === "menu-row") {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 active:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-800"
        aria-label={label}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {icon}
        </span>
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
