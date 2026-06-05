"use client";

import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";

/**
 * Shown when a session exists but loading `/api/accounts/me` failed (e.g. backend down).
 * Lets the user retry without being silently logged out.
 */
export function ConnectionBanner() {
  const { connectionIssueKey, connectionRetryBusy, retryConnection, logout } = useAuth();
  const { t } = useLocale();

  if (!connectionIssueKey) return null;

  return (
    <div
      role="alert"
      className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="min-w-0 text-sm leading-snug">{t(connectionIssueKey)}</p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void retryConnection()}
            disabled={connectionRetryBusy}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-400"
          >
            {connectionRetryBusy ? t("errors.retrying") : t("errors.retry")}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-amber-800/30 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-400/30 dark:text-amber-50 dark:hover:bg-amber-900/50"
          >
            {t("errors.signOutInstead")}
          </button>
        </div>
      </div>
    </div>
  );
}
