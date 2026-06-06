"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "@/locales/en";
import fr from "@/locales/fr";
import {
  LOCALE_STORAGE_KEY,
  writeLocaleCookie,
  type AppLocale,
} from "@/lib/locale-shared";

/**
 * Locale + translation context for the UI.
 *
 * - Stores the user's preference in `localStorage` so it persists across reloads.
 * - Uses a simple dictionary lookup (`t(key)`) with optional `{{var}}` interpolation.
 * - Initializes on the client to avoid SSR/client mismatch when reading browser APIs.
 */
type Dictionary = Record<string, string>;
type Vars = Record<string, string | number>;

const dictionaries: Record<AppLocale, Dictionary> = { en, fr };

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, vars?: Vars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Reads saved locale or a browser hint (client only). */
function getBrowserLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "en" || saved === "fr") {
      return saved;
    }
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith("fr")) {
      return "fr";
    }
  } catch {
    // Ignore storage/browser locale errors.
  }
  return "en";
}

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  /** From locale cookie on the server so SSR matches the first client render. */
  initialLocale?: AppLocale;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    const next = getBrowserLocale();
    startTransition(() => {
      setLocaleState((current) => (current === next ? current : next));
    });
    document.documentElement.lang = next;
    writeLocaleCookie(next);
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    startTransition(() => {
      setLocaleState(next);
    });
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors.
    }
    writeLocaleCookie(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale];
    const fallback = dictionaries.en;
    const t = (key: string, vars?: Vars) => {
      const template = dict[key] ?? fallback[key] ?? key;
      if (!vars) return template;
      // Lightweight mustache-style interpolation: "Hello {{name}}".
      return template.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
        const value = vars[varName];
        return value == null ? "" : String(value);
      });
    };
    return { locale, setLocale, t };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
