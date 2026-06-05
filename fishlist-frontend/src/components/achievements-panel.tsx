"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AchievementBadge } from "@/components/achievement-badge";
import { useAchievementToasts } from "@/contexts/achievement-toast-context";
import { useLocale } from "@/contexts/locale-context";
import {
  fetchAccountAchievements,
  fetchMyAchievements,
  getDisplayErrorMessage,
  type AchievementProgressResponse,
} from "@/lib/api";

type AchievementsPanelProps = {
  /** When set, fetches another user's achievements via {@code /api/achievements/users/{id}}. */
  accountId?: number;
  /** Visual variant. {@code self} shows the section title + role badge; {@code public} keeps it compact. */
  variant?: "self" | "public";
  /** Compact mode: trims to the most relevant badges and shows a "view all" expander. */
  initialPreviewCount?: number;
};

type FilterTab = "all" | "unlocked" | "locked";

const TABS: FilterTab[] = ["unlocked", "locked", "all"];

/**
 * Side-by-side achievement card for /profile and /users/[id].
 * Self-fetches its data so the host page only has to drop {@code <AchievementsPanel />} in.
 */
export function AchievementsPanel({
  accountId,
  variant = "self",
  initialPreviewCount = 6,
}: AchievementsPanelProps) {
  const { t } = useLocale();
  const { unlockTick } = useAchievementToasts();
  const [data, setData] = useState<AchievementProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [showAll, setShowAll] = useState(false);

  // Re-fetches on initial mount, when the viewed account changes, and when a new unlock
  // is pushed via the global toast dispatcher (so the panel reflects the latest state
  // without requiring a manual page refresh).
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res =
        accountId == null
          ? await fetchMyAchievements()
          : await fetchAccountAchievements(accountId);
      setData(res);
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("users.loadError")));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accountId, t]);

  useEffect(() => {
    void load();
  }, [load, unlockTick]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "unlocked") {
      return data.achievements.filter((a) => a.unlocked);
    }
    if (tab === "locked") {
      return data.achievements.filter((a) => !a.unlocked);
    }
    return data.achievements;
  }, [data, tab]);

  const visible = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, initialPreviewCount);
  }, [filtered, showAll, initialPreviewCount]);

  const isAdmin = data?.admin ?? false;
  const roleLabelKey = data?.roleTierLabelKey;
  const nextRoleLabelKey = data?.nextRoleTierLabelKey ?? null;

  return (
    <section
      aria-label={t("achievements.section.title")}
      className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white/95 shadow-md shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      <header className="flex flex-col gap-4 border-b border-zinc-200/80 bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-50 px-5 py-5 dark:border-zinc-800/80 dark:from-sky-950/40 dark:via-indigo-950/40 dark:to-violet-950/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            {t("achievements.section.title")}
          </p>
          {variant === "self" && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {t("achievements.section.subtitle")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/15 dark:text-rose-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className="h-3 w-3"
              >
                <path
                  d="M12 2 4 6v6c0 4.5 3.4 8.6 8 10 4.6-1.4 8-5.5 8-10V6l-8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              {t("roles.adminBadge")}
            </span>
          )}
          {roleLabelKey && (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-200">
              <span className="text-[0.6rem] uppercase tracking-wider opacity-80">
                {t("achievements.summary.role")}
              </span>
              <span>{t(roleLabelKey)}</span>
            </span>
          )}
        </div>
      </header>

      <div className="px-5 py-5">
        {loading && (
          <p className="py-8 text-center text-sm text-zinc-500">
            {t("profile.loading")}
          </p>
        )}
        {error && !loading && (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {!loading && !error && data && (
          <>
            <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryStat
                label={t("achievements.summary.role")}
                value={t(data.roleTierLabelKey)}
                accent
              />
              <SummaryStat
                label={t("achievements.summary.xp", { xp: "" }).replace(
                  /\s*XP$/u,
                  "",
                )}
                value={`${data.xp} XP`}
              />
              <SummaryStat
                label={t("achievements.section.title")}
                value={`${data.unlockedCount} / ${data.totalCount}`}
              />
            </div>

            {data.nextRoleTier && nextRoleLabelKey ? (
              <NextRoleBar
                xp={data.xp}
                nextLabel={t(nextRoleLabelKey)}
                nextMinXp={data.nextRoleTierMinXp ?? 0}
              />
            ) : (
              <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-center text-xs font-medium text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
                {t("achievements.summary.maxRole")}
              </p>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {TABS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setTab(entry);
                    setShowAll(false);
                  }}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    tab === entry
                      ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
                  ].join(" ")}
                  aria-pressed={tab === entry}
                >
                  {t(`achievements.tab.${entry}`)}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
                {t("achievements.empty.locked")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visible.map((achievement) => (
                  <AchievementBadge
                    key={achievement.code}
                    achievement={achievement}
                  />
                ))}
              </div>
            )}

            {filtered.length > initialPreviewCount && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {showAll
                    ? t("achievements.viewLess")
                    : t("achievements.viewAll")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-3 py-3 text-center",
        accent
          ? "border-amber-300 bg-amber-50/70 dark:border-amber-400/60 dark:bg-amber-500/10"
          : "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/50",
      ].join(" ")}
    >
      <p
        className={[
          "text-[0.6rem] font-semibold uppercase tracking-wider",
          accent
            ? "text-amber-700 dark:text-amber-300"
            : "text-zinc-500",
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          "mt-1 text-base font-semibold",
          accent
            ? "text-amber-900 dark:text-amber-100"
            : "text-zinc-900 dark:text-zinc-50",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function NextRoleBar({
  xp,
  nextLabel,
  nextMinXp,
}: {
  xp: number;
  nextLabel: string;
  nextMinXp: number;
}) {
  const { t } = useLocale();
  const remaining = Math.max(0, nextMinXp - xp);
  const denom = Math.max(1, nextMinXp);
  const pct = Math.min(100, Math.round((xp / denom) * 100));
  return (
    <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {t("achievements.summary.nextRole", {
          role: nextLabel,
          xp: nextMinXp,
          remaining,
        })}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
