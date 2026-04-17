"use client";

import { useLocale } from "@/contexts/locale-context";
import { NavThemeToggle } from "@/components/nav-theme-toggle";

type NavLangThemeGroupProps = {
  className?: string;
};

/** EN / FR / sun-moon in one pill; 44px-class targets on small screens. */
export function NavLangThemeGroup({ className }: NavLangThemeGroupProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={[
        "inline-flex h-11 shrink-0 touch-manipulation items-center gap-0.5 rounded-xl border border-zinc-300 bg-white/95 p-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/90",
        className ?? "",
      ].join(" ")}
      role="group"
      aria-label={t("nav.langThemeGroup")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={[
          "flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors sm:min-h-9 sm:min-w-9 sm:px-2.5",
          locale === "en"
            ? "bg-sky-600 text-white"
            : "text-zinc-600 active:bg-zinc-200/80 dark:text-zinc-300 dark:active:bg-zinc-700/80",
        ].join(" ")}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={[
          "flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors sm:min-h-9 sm:min-w-9 sm:px-2.5",
          locale === "fr"
            ? "bg-sky-600 text-white"
            : "text-zinc-600 active:bg-zinc-200/80 dark:text-zinc-300 dark:active:bg-zinc-700/80",
        ].join(" ")}
        aria-pressed={locale === "fr"}
        aria-label="Français"
      >
        FR
      </button>
      <span
        className="mx-0.5 h-6 w-px shrink-0 self-center bg-zinc-200 dark:bg-zinc-600"
        aria-hidden
      />
      <NavThemeToggle grouped />
    </div>
  );
}
