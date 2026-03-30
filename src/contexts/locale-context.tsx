"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "@/locales/en";
import fr from "@/locales/fr";

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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Ignore storage write errors.
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale];
    const fallback = dictionaries.en;
    const t = (key: string, vars?: Vars) => {
      const template = dict[key] ?? fallback[key] ?? key;
      if (!vars) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
        const value = vars[varName];
        return value == null ? "" : String(value);
      });
    };
    return { locale, setLocale, t };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
