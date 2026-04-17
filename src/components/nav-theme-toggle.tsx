"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useLocale } from "@/contexts/locale-context";

/** True only after hydration — `useSyncExternalStore` + microtask, not setState in useEffect. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      queueMicrotask(onStoreChange);
      return () => {};
    },
    () => true,
    () => false,
  );
}

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
  /** Sit inside the EN/FR pill: no outer border, matches row height. */
  grouped?: boolean;
};

/** Moon in light mode → dark; sun in dark mode → light. */
export function NavThemeToggle({ grouped }: NavThemeToggleProps) {
  const { t } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("nav.useLightMode") : t("nav.useDarkMode");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={[
        "inline-flex shrink-0 touch-manipulation items-center justify-center rounded-lg text-zinc-700 transition-colors dark:text-zinc-200",
        "min-h-11 min-w-11 active:bg-zinc-200/90 sm:min-h-10 sm:min-w-10 dark:active:bg-zinc-700/90",
        grouped
          ? "border-0 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
          : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      {!mounted ? (
        <MoonIcon className="h-5 w-5 opacity-40 sm:h-4 sm:w-4" />
      ) : isDark ? (
        <SunIcon className="h-5 w-5 sm:h-4 sm:w-4" />
      ) : (
        <MoonIcon className="h-5 w-5 sm:h-4 sm:w-4" />
      )}
    </button>
  );
}
