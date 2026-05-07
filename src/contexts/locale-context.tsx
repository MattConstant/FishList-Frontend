"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "@/locales/en";
import fr from "@/locales/fr";

/**
 * Locale + translation context for the UI.
 *
 * - Stores the user's preference in `localStorage` so it persists across reloads.
 * - Uses a simple dictionary lookup (`t(key)`) with optional `{{var}}` interpolation.
 * - Initializes on the client to avoid SSR/client mismatch when reading browser APIs.
 */
type Locale = "en" | "fr";
type Dictionary = Record<string, string>;
type Vars = Record<string, string | number>;

const LOCALE_KEY = "fishlist-locale";
const dictionaries: Record<Locale, Dictionary> = { en, fr };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Vars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Reads saved locale or a browser hint (client only). */
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
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

/**
 * Use a fixed initial locale so server HTML === first client render (avoids hydration errors).
 * Real preference is applied in `useEffect` on the client only.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Deliberately "en" on first render; we update to the actual preference after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    queueMicrotask(() => {
      const next = getInitialLocale();
      setLocaleState(next);
      // Keep `<html lang="...">` aligned for accessibility and built-in browser behaviors.
      document.documentElement.lang = next;
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // Ignore storage write errors.
    }
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
