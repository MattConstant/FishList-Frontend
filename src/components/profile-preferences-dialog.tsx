"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
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

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

type DraftLocale = "en" | "fr";
type DraftTheme = "system" | "light" | "dark";

type PreferencesDraft = {
  theme: DraftTheme;
  locale: DraftLocale;
  favorites: string[];
  autoFilter: boolean;
  araMapKeys: Set<AraSpeciesFilter>;
  araTargetKeys: Set<AraSpeciesFilter>;
};

function serializePrefs(d: PreferencesDraft): string {
  return JSON.stringify({
    theme: d.theme,
    locale: d.locale,
    favorites: [...d.favorites].sort(),
    autoFilter: d.autoFilter,
    araMap: [...d.araMapKeys].sort(),
    araTarget: [...d.araTargetKeys].sort(),
  });
}

function emptyDraft(): PreferencesDraft {
  return {
    theme: "system",
    locale: "en",
    favorites: [],
    autoFilter: false,
    araMapKeys: new Set<AraSpeciesFilter>(),
    araTargetKeys: new Set<AraSpeciesFilter>(),
  };
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

function sectionCardClass() {
  return "rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900/70";
}

export function ProfilePreferencesDialog({ open, onClose }: ProfilePreferencesDialogProps) {
  const { t, locale: liveLocale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const titleId = useId();
  const [baselineSerialized, setBaselineSerialized] = useState("");
  const [draft, setDraft] = useState<PreferencesDraft>(() => emptyDraft());
  const [prefsReady, setPrefsReady] = useState(false);

  const [species, setSpecies] = useState<string[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPrefsReady(false);
      return;
    }
    queueMicrotask(() => {
      const resolvedTheme: DraftTheme =
        theme === "light" || theme === "dark" ? theme : "system";
      const d: PreferencesDraft = {
        theme: resolvedTheme,
        locale: liveLocale === "fr" ? "fr" : "en",
        favorites: loadFavoriteSpecies(),
        autoFilter: getAutoFilterFavoriteSpecies(),
        araMapKeys: loadAraMapFilterSet(),
        araTargetKeys: new Set(loadAraTargetSpecies()),
      };
      setDraft(d);
      setBaselineSerialized(serializePrefs(d));
      setPrefsReady(true);
    });
    // Snapshot stored prefs when the sheet opens only (deps deliberately not theme/locale).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid resetting draft while editing
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSpeciesLoading(true);
    });
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

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleCancel]);

  const isDirty = prefsReady && serializePrefs(draft) !== baselineSerialized;

  const applyAndClose = useCallback(() => {
    setTheme(draft.theme);
    setLocale(draft.locale);
    saveFavoriteSpecies(draft.favorites);
    setAutoFilterFavoriteSpecies(draft.autoFilter);
    saveAraMapFilterSet(draft.araMapKeys);
    saveAraTargetSpecies([...draft.araTargetKeys]);
    notifyClientPrefsUpdated();
    onClose();
  }, [draft, onClose, setLocale, setTheme]);

  const toggleFavorite = useCallback((name: string) => {
    setDraft((prev) => {
      const next = new Set(prev.favorites);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...prev, favorites: Array.from(next) };
    });
  }, []);

  const setAllFavorites = useCallback(
    (all: boolean) => {
      if (all) {
        setDraft((prev) => ({ ...prev, favorites: [...species] }));
      } else {
        setDraft((prev) => ({ ...prev, favorites: [] }));
      }
    },
    [species],
  );

  const toggleAraMapKey = useCallback((k: AraSpeciesFilter) => {
    setDraft((prev) => {
      const next = new Set(prev.araMapKeys);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return { ...prev, araMapKeys: next };
    });
  }, []);

  const toggleAraTargetKey = useCallback((k: AraSpeciesFilter) => {
    setDraft((prev) => {
      const next = new Set(prev.araTargetKeys);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return { ...prev, araTargetKeys: next };
    });
  }, []);

  const setAllAraMapKeys = useCallback((all: boolean) => {
    const next = all
      ? new Set<AraSpeciesFilter>(ARA_SPECIES_FILTERS)
      : new Set<AraSpeciesFilter>();
    setDraft((prev) => ({ ...prev, araMapKeys: next }));
  }, []);

  if (!open) return null;

  const themeValue = !mounted ? null : draft.theme;

  const content = (
    <div
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
      className="fixed inset-0 z-[10000] flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <header className="flex shrink-0 flex-col gap-1 border-b border-zinc-200/90 bg-white px-4 py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-zinc-800 dark:bg-zinc-900">
        <h2
          id={titleId}
          className="min-w-0 text-lg font-semibold tracking-tight"
        >
          {t("profile.prefs.title")}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t("profile.prefs.subtitle")}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <section className={sectionCardClass()}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t("profile.prefs.display.title")}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.display.body")}
            </p>
            <div
              className="mt-3 inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-50/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-950/50"
              role="group"
              aria-label={t("profile.prefs.themeGroup")}
            >
              <button
                type="button"
                className={segmentClass(themeValue === "system")}
                onClick={() => setDraft((d) => ({ ...d, theme: "system" }))}
                disabled={!mounted}
              >
                {t("profile.prefs.themeSystem")}
              </button>
              <button
                type="button"
                className={segmentClass(themeValue === "light")}
                onClick={() => setDraft((d) => ({ ...d, theme: "light" }))}
                disabled={!mounted}
              >
                {t("profile.prefs.themeLight")}
              </button>
              <button
                type="button"
                className={segmentClass(themeValue === "dark")}
                onClick={() => setDraft((d) => ({ ...d, theme: "dark" }))}
                disabled={!mounted}
              >
                {t("profile.prefs.themeDark")}
              </button>
            </div>
            {!mounted ? (
              <p className="mt-2 text-xs text-zinc-500">{t("profile.loading")}</p>
            ) : null}
          </section>

          <section className={sectionCardClass()}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t("profile.prefs.language.title")}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.language.body")}
            </p>
            <div
              className="mt-3 inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-50/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-950/50"
              role="group"
              aria-label={t("profile.prefs.languageGroup")}
            >
              <button
                type="button"
                className={segmentClass(draft.locale === "en")}
                onClick={() => setDraft((d) => ({ ...d, locale: "en" }))}
              >
                {t("profile.prefs.langEn")}
              </button>
              <button
                type="button"
                className={segmentClass(draft.locale === "fr")}
                onClick={() => setDraft((d) => ({ ...d, locale: "fr" }))}
              >
                {t("profile.prefs.langFr")}
              </button>
            </div>
          </section>

          <section className={sectionCardClass()}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t("profile.prefs.stocking.title")}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.stocking.body")}
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800/40">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                checked={draft.autoFilter}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, autoFilter: e.target.checked }))
                }
              />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {t("profile.prefs.autoFilterLabel")}
              </span>
            </label>
            {draft.autoFilter && draft.favorites.length === 0 && species.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
                {t("profile.prefs.autoFilterHint")}
              </p>
            ) : null}

            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
                    const checked = draft.favorites.includes(sp);
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
                            {translateStockingSpecies(sp, draft.locale)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section className={`${sectionCardClass()} mb-2`}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t("profile.prefs.presence.title")}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.presence.body")}
            </p>

            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-300/90">
              {t("profile.prefs.araMapSection")}
            </h4>
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
                      checked={draft.araMapKeys.has(key)}
                      onChange={() => toggleAraMapKey(key)}
                    />
                    <span className="text-zinc-800 dark:text-zinc-100">
                      {t(`map.ara.species.${key}`)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-amber-800/90 dark:text-amber-300/90">
              {t("profile.prefs.araTargetsSection")}
            </h4>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {t("profile.prefs.araTargetsHelp")}
            </p>
            <div className="mb-2">
              <button
                type="button"
                className="text-xs font-semibold text-zinc-600 underline decoration-zinc-400/50 underline-offset-2 dark:text-zinc-400"
                onClick={() =>
                  setDraft((d) => ({ ...d, araTargetKeys: new Set() }))
                }
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
                      checked={draft.araTargetKeys.has(key)}
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

      <footer className="flex shrink-0 gap-3 border-t border-zinc-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
        >
          {t("profile.prefs.cancel")}
        </button>
        <button
          type="button"
          onClick={applyAndClose}
          disabled={!prefsReady || !isDirty}
          className={[
            "min-h-11 flex-[1.15] rounded-xl px-4 text-sm font-semibold shadow-sm transition",
            !prefsReady || !isDirty
              ? "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
              : "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500",
          ].join(" ")}
        >
          {t("profile.prefs.save")}
        </button>
      </footer>
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
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white",
          className ?? "",
        ].join(" ")}
        title={t("profile.prefs.open")}
        aria-label={t("profile.prefs.open")}
      >
        <GearIcon className="h-5 w-5" />
      </button>
      <ProfilePreferencesDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
