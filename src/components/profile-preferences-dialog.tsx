"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { useLocale } from "@/contexts/locale-context";
import {
  fetchAllStockingRecords,
  allSpecies,
} from "@/lib/geohub";
import {
  getAutoFilterFavoriteSpecies,
  loadFavoriteSpecies,
  saveFavoriteSpecies,
  setAutoFilterFavoriteSpecies,
} from "@/lib/fish-species-preferences";
import { ARA_SPECIES_FILTERS, type AraSpeciesFilter } from "@/lib/ara-fish";
import {
  loadAraMapFilterSet,
  loadAraTargetSpecies,
  saveAraMapFilterSet,
  saveAraTargetSpecies,
} from "@/lib/ara-preferences";
import { notifyClientPrefsUpdated } from "@/lib/client-prefs-events";
import { translateStockingSpecies } from "@/lib/species-i18n";

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

type ProfilePreferencesDialogProps = {
  open: boolean;
  onClose: () => void;
};

function segmentClass(active: boolean) {
  return [
    "flex min-h-9 flex-1 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition",
    active
      ? "bg-sky-600 text-white"
      : "text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-700/80",
  ].join(" ");
}

export function ProfilePreferencesDialog({ open, onClose }: ProfilePreferencesDialogProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const [species, setSpecies] = useState<string[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [autoFilter, setAutoFilter] = useState(false);
  const [araMapKeys, setAraMapKeys] = useState<Set<AraSpeciesFilter>>(
    () => new Set(ARA_SPECIES_FILTERS),
  );
  const [araTargetKeys, setAraTargetKeys] = useState<Set<AraSpeciesFilter>>(
    () => new Set(),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFavorites(loadFavoriteSpecies());
    setAutoFilter(getAutoFilterFavoriteSpecies());
    setAraMapKeys(loadAraMapFilterSet());
    setAraTargetKeys(new Set(loadAraTargetSpecies()));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSpeciesLoading(true);
    fetchAllStockingRecords(5, () => {})
      .then((data) => {
        if (cancelled) return;
        const sp = allSpecies(data).sort((a, b) => a.localeCompare(b));
        setSpecies(sp);
      })
      .catch(() => {
        if (!cancelled) setSpecies([]);
      })
      .finally(() => {
        if (!cancelled) setSpeciesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      const arr = Array.from(next);
      saveFavoriteSpecies(arr);
      return arr;
    });
  }, []);

  const setAllFavorites = useCallback((all: boolean) => {
    if (all) {
      const arr = [...species];
      saveFavoriteSpecies(arr);
      setFavorites(arr);
    } else {
      saveFavoriteSpecies([]);
      setFavorites([]);
    }
  }, [species]);

  const toggleAraMapKey = useCallback((k: AraSpeciesFilter) => {
    setAraMapKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      saveAraMapFilterSet(next);
      notifyClientPrefsUpdated();
      return next;
    });
  }, []);

  const toggleAraTargetKey = useCallback((k: AraSpeciesFilter) => {
    setAraTargetKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      saveAraTargetSpecies([...next]);
      notifyClientPrefsUpdated();
      return next;
    });
  }, []);

  const setAllAraMapKeys = useCallback((all: boolean) => {
    const next = all
      ? new Set<AraSpeciesFilter>(ARA_SPECIES_FILTERS)
      : new Set<AraSpeciesFilter>();
    setAraMapKeys(next);
    saveAraMapFilterSet(next);
    notifyClientPrefsUpdated();
  }, []);

  if (!open) return null;

  const themeValue = !mounted ? null : (theme ?? "system");

  const content = (
    <div
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
      className="fixed inset-0 z-[300] flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
    >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200/90 bg-white px-4 py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2
            id={titleId}
            className="min-w-0 text-lg font-semibold tracking-tight"
          >
            {t("profile.prefs.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 active:bg-zinc-200/80 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:active:bg-zinc-700/80"
            aria-label={t("profile.prefs.close")}
          >
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6"
        >
          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("profile.prefs.appearance")}
            </h3>
            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.themeHelp")}
            </p>
            <div
              className="inline-flex w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-950/50"
              role="group"
              aria-label={t("profile.prefs.themeGroup")}
            >
              <button
                type="button"
                className={segmentClass(themeValue === "system")}
                onClick={() => setTheme("system")}
                disabled={!mounted}
              >
                {t("profile.prefs.themeSystem")}
              </button>
              <button
                type="button"
                className={segmentClass(themeValue === "light")}
                onClick={() => setTheme("light")}
                disabled={!mounted}
              >
                {t("profile.prefs.themeLight")}
              </button>
              <button
                type="button"
                className={segmentClass(themeValue === "dark")}
                onClick={() => setTheme("dark")}
                disabled={!mounted}
              >
                {t("profile.prefs.themeDark")}
              </button>
            </div>
            {!mounted ? (
              <p className="mt-1 text-xs text-zinc-500">{t("profile.loading")}</p>
            ) : null}
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("profile.prefs.language")}
            </h3>
            <div
              className="inline-flex w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-950/50"
              role="group"
              aria-label={t("profile.prefs.languageGroup")}
            >
              <button
                type="button"
                className={segmentClass(locale === "en")}
                onClick={() => setLocale("en")}
              >
                {t("profile.prefs.langEn")}
              </button>
              <button
                type="button"
                className={segmentClass(locale === "fr")}
                onClick={() => setLocale("fr")}
              >
                {t("profile.prefs.langFr")}
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("profile.prefs.mapFish")}
            </h3>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.mapFishHelp")}
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800/40">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                checked={autoFilter}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAutoFilter(v);
                  setAutoFilterFavoriteSpecies(v);
                }}
              />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {t("profile.prefs.autoFilterLabel")}
              </span>
            </label>
            {autoFilter && favorites.length === 0 && species.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
                {t("profile.prefs.autoFilterHint")}
              </p>
            ) : null}

            <p className="mb-2 mt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("profile.prefs.favoriteSpecies")}
            </p>
            {speciesLoading ? (
              <p className="text-sm text-zinc-500">{t("profile.loading")}</p>
            ) : species.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("profile.prefs.speciesLoadError")}</p>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-sky-700 underline decoration-sky-600/50 underline-offset-2 dark:text-sky-400"
                    onClick={() => setAllFavorites(true)}
                  >
                    {t("profile.prefs.selectAllSpecies")}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-zinc-600 underline decoration-zinc-400/50 underline-offset-2 dark:text-zinc-400"
                    onClick={() => setAllFavorites(false)}
                  >
                    {t("profile.prefs.clearSpecies")}
                  </button>
                </div>
                <ul className="max-h-[min(55dvh,28rem)] space-y-1.5 overflow-y-auto rounded-xl border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900/60">
                  {species.map((sp) => {
                    const checked = favorites.includes(sp);
                    return (
                      <li key={sp}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                            checked={checked}
                            onChange={() => toggleFavorite(sp)}
                          />
                          <span className="text-zinc-800 dark:text-zinc-100">
                            {translateStockingSpecies(sp, locale)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section className="mb-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("profile.prefs.araMapSection")}
            </h3>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.araMapHelp")}
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs font-semibold text-emerald-800 underline decoration-emerald-600/50 underline-offset-2 dark:text-emerald-300"
                onClick={() => setAllAraMapKeys(true)}
              >
                {t("profile.prefs.selectAllSpecies")}
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-zinc-600 underline decoration-zinc-400/50 underline-offset-2 dark:text-zinc-400"
                onClick={() => setAllAraMapKeys(false)}
              >
                {t("profile.prefs.araMapClear")}
              </button>
            </div>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-emerald-200/80 bg-white px-2 py-2 dark:border-emerald-900/50 dark:bg-zinc-900/60">
              {ARA_SPECIES_FILTERS.map((key) => (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      checked={araMapKeys.has(key)}
                      onChange={() => toggleAraMapKey(key)}
                    />
                    <span className="text-zinc-800 dark:text-zinc-100">
                      {t(`map.ara.species.${key}`)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("profile.prefs.araTargetsSection")}
            </h3>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.araTargetsHelp")}
            </p>
            <div className="mb-2">
              <button
                type="button"
                className="text-xs font-semibold text-zinc-600 underline decoration-zinc-400/50 underline-offset-2 dark:text-zinc-400"
                onClick={() => {
                  setAraTargetKeys(new Set());
                  saveAraTargetSpecies([]);
                  notifyClientPrefsUpdated();
                }}
              >
                {t("profile.prefs.araTargetsClear")}
              </button>
            </div>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-amber-200/80 bg-white px-2 py-2 dark:border-amber-900/40 dark:bg-zinc-900/60">
              {ARA_SPECIES_FILTERS.map((key) => (
                <li key={`t-${key}`}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-amber-50/80 dark:hover:bg-amber-950/30">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                      checked={araTargetKeys.has(key)}
                      onChange={() => toggleAraTargetKey(key)}
                    />
                    <span className="text-zinc-800 dark:text-zinc-100">
                      {t(`map.ara.species.${key}`)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }
  return createPortal(content, document.body);
}

type ProfilePreferencesTriggerProps = {
  className?: string;
};

export function ProfilePreferencesTrigger({ className }: ProfilePreferencesTriggerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50/90 text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100/90 active:bg-amber-200/50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-400/30 dark:hover:bg-amber-500/15",
          className ?? "",
        ].join(" ")}
        title={t("profile.prefs.open")}
        aria-label={t("profile.prefs.open")}
      >
        <SunIcon className="h-5 w-5" />
      </button>
      <ProfilePreferencesDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
