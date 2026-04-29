"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  setAchievementToastDispatcher,
  type UnlockedAchievementSummary,
} from "@/lib/api";
import {
  AchievementIcon,
} from "@/components/achievement-icon";
import {
  rarityBadgeClasses,
  rarityRingClasses,
} from "@/components/achievement-badge";

type ToastEntry = UnlockedAchievementSummary & { id: string; expiresAt: number };

type AchievementToastContextValue = {
  /** Manual hook for components that already hold an unlock list and want to surface it. */
  pushAchievementUnlocks: (list: UnlockedAchievementSummary[]) => void;
  /**
   * Monotonic counter; bumps each time a new unlock is pushed. UI panels can use it as a
   * dependency in a {@code useEffect} to re-fetch /api/achievements without polling.
   */
  unlockTick: number;
};

const AchievementToastContext =
  createContext<AchievementToastContextValue | null>(null);

const TOAST_DURATION_MS = 6000;

/**
 * Renders queued unlock toasts in a fixed corner viewport. Wires a module-level dispatcher in
 * {@code @/lib/api} so any API call that returns unlocks (catches, likes, comments, friend
 * adds) shows a toast without needing to thread the data manually through React state.
 */
export function AchievementToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [unlockTick, setUnlockTick] = useState(0);
  const counter = useRef(0);

  const pushAchievementUnlocks = useCallback(
    (list: UnlockedAchievementSummary[]) => {
      if (!list || list.length === 0) return;
      const now = Date.now();
      setToasts((prev) => {
        const next = list.map((item) => {
          counter.current += 1;
          return {
            ...item,
            id: `${now}-${counter.current}`,
            expiresAt: now + TOAST_DURATION_MS + counter.current * 80,
          };
        });
        // Keep the queue from getting absurd if a backfill ever fires many at once.
        return [...prev, ...next].slice(-6);
      });
      setUnlockTick((n) => n + 1);
    },
    [],
  );

  useEffect(() => {
    setAchievementToastDispatcher(pushAchievementUnlocks);
    return () => setAchievementToastDispatcher(null);
  }, [pushAchievementUnlocks]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setToasts((prev) => {
        const remaining = prev.filter((toast) => toast.expiresAt > now);
        return remaining.length === prev.length ? prev : remaining;
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, [toasts.length]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(
    () => ({ pushAchievementUnlocks, unlockTick }),
    [pushAchievementUnlocks, unlockTick],
  );

  return (
    <AchievementToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label={t("achievements.toast.unlocked")}
        className="pointer-events-none fixed bottom-4 right-4 z-[10000] flex w-full max-w-sm flex-col gap-2 px-2 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto rounded-2xl border bg-white/95 p-4 shadow-xl shadow-zinc-900/15 backdrop-blur transition dark:bg-zinc-900/95",
              rarityBadgeClasses(toast.rarity),
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-current ring-2 dark:bg-zinc-950/40",
                  rarityRingClasses(toast.rarity),
                ].join(" ")}
                aria-hidden
              >
                <AchievementIcon
                  code={toast.code}
                  category={categoryFor(toast.code)}
                  className="h-6 w-6"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide opacity-80">
                  {t("achievements.toast.unlocked")}
                </p>
                <p className="text-sm font-semibold leading-tight">
                  {t(toast.titleKey)}
                </p>
                <p className="mt-0.5 text-xs leading-snug opacity-80">
                  {t(toast.descriptionKey)}
                </p>
                <p className="mt-1 text-[0.7rem] font-semibold tabular-nums opacity-90">
                  {t("achievements.toast.xp", { xp: toast.xp })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-white/10"
                aria-label={t("achievements.toast.dismiss")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="M6 6l12 12M6 18 18 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </AchievementToastContext.Provider>
  );
}

export function useAchievementToasts() {
  const ctx = useContext(AchievementToastContext);
  if (!ctx) {
    throw new Error(
      "useAchievementToasts must be used within an AchievementToastProvider",
    );
  }
  return ctx;
}

/** Map an achievement code to its category — used by the toast since the wire payload omits it. */
function categoryFor(code: UnlockedAchievementSummary["code"]) {
  switch (code) {
    case "THREE_LOCATIONS":
    case "TEN_LOCATIONS":
      return "EXPLORATION" as const;
    case "FIRST_LIKE_GIVEN":
    case "FIRST_COMMENT":
    case "FIRST_FRIEND":
    case "POPULAR_CATCH":
      return "SOCIAL" as const;
    default:
      return "CATCH" as const;
  }
}
