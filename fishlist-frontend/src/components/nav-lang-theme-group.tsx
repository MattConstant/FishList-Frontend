"use client";

import { useLocale } from "@/contexts/locale-context";
import { NavThemeToggle } from "@/components/nav-theme-toggle";

type NavLangThemeGroupProps = {
  className?: string;
  /** Side-by-side in the header (md+). Preferences block in the mobile menu. */
  variant?: "toolbar" | "menu";
};

function NavLangSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  const btn = (active: boolean) =>
    [
      "flex-1 touch-manipulation rounded-md px-3 py-2 text-xs font-semibold transition-colors",
      compact ? "py-1.5" : "py-2",
      active
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
    ].join(" ");

  return (
    <div
      className={[
        "inline-grid grid-cols-2 gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100/90 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/90",
        compact ? "h-9 min-w-[5.5rem]" : "min-w-[6.5rem]",
      ].join(" ")}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={btn(locale === "en")}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={btn(locale === "fr")}
        aria-pressed={locale === "fr"}
        aria-label="Français"
      >
        FR
      </button>
    </div>
  );
}

/** Language switcher + theme toggle (toolbar) or preferences block (mobile menu). */
export function NavLangThemeGroup({ className, variant = "toolbar" }: NavLangThemeGroupProps) {
  const { t } = useLocale();

  if (variant === "menu") {
    return (
      <div
        className={[
          "mt-2 space-y-1 border-t border-zinc-200 pt-2 dark:border-zinc-800",
          className ?? "",
        ].join(" ")}
      >
        <p className="px-3 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t("nav.language")}
        </p>
        <div className="px-3 pb-1">
          <NavLangSwitcher />
        </div>
        <NavThemeToggle variant="menu-row" />
      </div>
    );
  }

  return (
    <div className={["flex items-center gap-1.5", className ?? ""].join(" ")}>
      <NavLangSwitcher compact />
      <NavThemeToggle variant="icon" />
    </div>
  );
}
