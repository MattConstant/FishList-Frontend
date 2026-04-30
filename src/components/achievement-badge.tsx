"use client";

import { useLocale } from "@/contexts/locale-context";
import type {
  AchievementCategory,
  AchievementRarity,
  AchievementResponse,
} from "@/lib/api";
import { AchievementIcon } from "@/components/achievement-icon";
import { formatAppShortDate } from "@/lib/format-app-locale";

/**
 * Color/glow palette per rarity — applied to the badge frame, glyph, and (when unlocked) the
 * ribbon. Locked badges fall back to a muted zinc treatment regardless of rarity so the user
 * can scan the page for what they already have.
 */
function rarityClasses(rarity: AchievementRarity, unlocked: boolean) {
  if (!unlocked) {
    return {
      container:
        "border-zinc-300/80 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400",
      icon: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      pill: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
      ring: "ring-zinc-300/60 dark:ring-zinc-700/70",
    };
  }
  switch (rarity) {
    case "LEGENDARY":
      return {
        container:
          "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900 shadow-amber-200/60 dark:border-amber-400/60 dark:from-amber-500/15 dark:to-orange-700/20 dark:text-amber-100",
        icon: "bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-amber-300/60",
        pill: "bg-amber-500/20 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
        ring: "ring-amber-400/60",
      };
    case "RARE":
      return {
        container:
          "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-100 text-violet-900 shadow-violet-200/50 dark:border-violet-400/60 dark:from-violet-500/15 dark:to-indigo-700/20 dark:text-violet-100",
        icon: "bg-gradient-to-br from-violet-400 to-indigo-500 text-white",
        pill: "bg-violet-500/20 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200",
        ring: "ring-violet-400/60",
      };
    default:
      return {
        container:
          "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-900 dark:border-emerald-400/60 dark:from-emerald-500/15 dark:to-teal-700/20 dark:text-emerald-100",
        icon: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white",
        pill: "bg-emerald-500/20 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200",
        ring: "ring-emerald-400/60",
      };
  }
}

export function AchievementBadge({
  achievement,
}: {
  achievement: AchievementResponse;
}) {
  const { t, locale } = useLocale();
  const styles = rarityClasses(achievement.rarity, achievement.unlocked);
  const target = Math.max(1, achievement.target);
  const progressPct = Math.min(
    100,
    Math.round((achievement.progress / target) * 100),
  );

  return (
    <article
      className={[
        "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition",
        styles.container,
      ].join(" ")}
      data-unlocked={achievement.unlocked ? "true" : "false"}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-2",
            styles.icon,
            styles.ring,
          ].join(" ")}
          aria-hidden
        >
          <AchievementIcon
            code={achievement.code}
            category={achievement.category}
            className="h-6 w-6"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight">
              {t(achievement.titleKey)}
            </h3>
            <span
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                styles.pill,
              ].join(" ")}
            >
              +{achievement.xp} XP
            </span>
          </div>
          <p className="text-xs leading-snug opacity-80">
            {t(achievement.descriptionKey)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem]">
        <span className="inline-flex items-center gap-1 font-medium opacity-80">
          <CategoryDot category={achievement.category} />
          {t(`achievements.category.${achievement.category}`)}
          <span aria-hidden> · </span>
          {t(`achievements.rarity.${achievement.rarity}`)}
        </span>
        {achievement.unlocked ? (
          <span className="font-semibold opacity-90">
            {achievement.unlockedAt
              ? t("achievements.unlockedAt", {
                  date: formatAppShortDate(achievement.unlockedAt, locale),
                })
              : t("achievements.unlocked")}
          </span>
        ) : (
          <span className="font-mono tabular-nums opacity-90">
            {t("achievements.progress", {
              current: achievement.progress,
              target: achievement.target,
            })}
          </span>
        )}
      </div>

      {!achievement.unlocked && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all"
            style={{ width: `${progressPct}%` }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            role="progressbar"
          />
        </div>
      )}
    </article>
  );
}

function CategoryDot({ category }: { category: AchievementCategory }) {
  const color =
    category === "CATCH"
      ? "bg-sky-500"
      : category === "EXPLORATION"
        ? "bg-emerald-500"
        : "bg-rose-500";
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rounded-full ${color}`}
    />
  );
}

export function rarityRingClasses(
  rarity: AchievementRarity,
): string {
  switch (rarity) {
    case "LEGENDARY":
      return "ring-amber-400/70";
    case "RARE":
      return "ring-violet-400/70";
    default:
      return "ring-emerald-400/70";
  }
}

export function rarityBadgeClasses(rarity: AchievementRarity): string {
  switch (rarity) {
    case "LEGENDARY":
      return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-200";
    case "RARE":
      return "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-400/60 dark:bg-violet-500/15 dark:text-violet-200";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
}
