"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  adminDeleteAccount,
  fetchAdminAccountsPage,
  fetchAdminMe,
  fetchAdminSummary,
  fetchAdminUsageEvents,
  fetchAdminUsageSummary,
  getDisplayErrorMessage,
  type AdminAccountRowResponse,
  type AdminAccountSort,
  type AdminSummaryResponse,
  type AdminUsageEventRow,
  type AdminUsageSummaryResponse,
} from "@/lib/api";
import { formatAppInteger, formatAppShortDate } from "@/lib/format-app-locale";

const MIN_ACCOUNT_SEARCH_LEN = 2;
const ACCOUNTS_PAGE_SIZE = 25;
const USAGE_LOG_LIMIT = 100;

const USAGE_TYPE_LABEL_KEYS: Record<string, string> = {
  landing_map_cta: "admin.usage.type.landingMapCta",
  landing_signup_cta: "admin.usage.type.landingSignupCta",
  map_visit: "admin.usage.type.mapVisit",
  map_filter_species: "admin.usage.type.mapFilterSpecies",
  map_filter_district: "admin.usage.type.mapFilterDistrict",
  map_filter_years: "admin.usage.type.mapFilterYears",
  map_filter_min_fish: "admin.usage.type.mapFilterMinFish",
  map_filter_min_species: "admin.usage.type.mapFilterMinSpecies",
  map_layer: "admin.usage.type.mapLayer",
  map_search: "admin.usage.type.mapSearch",
  map_anon_pin: "admin.usage.type.mapAnonPin",
  map_login_pill: "admin.usage.type.mapLoginPill",
};

export default function AdminPage() {
  const { user, isReady } = useAuth();
  const { t, locale } = useLocale();
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchNotice, setSearchNotice] = useState("");
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null);

  const [usageSummary, setUsageSummary] = useState<AdminUsageSummaryResponse | null>(null);
  const [usageEvents, setUsageEvents] = useState<AdminUsageEventRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");

  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [modalSort, setModalSort] = useState<AdminAccountSort>("username");
  const [modalPage, setModalPage] = useState(0);
  const [modalAccounts, setModalAccounts] = useState<AdminAccountRowResponse[]>([]);
  const [modalTotalPages, setModalTotalPages] = useState(0);
  const [modalTotalElements, setModalTotalElements] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError("");
    try {
      const [nextSummary, nextEvents] = await Promise.all([
        fetchAdminUsageSummary(),
        fetchAdminUsageEvents(USAGE_LOG_LIMIT),
      ]);
      setUsageSummary(nextSummary);
      setUsageEvents(nextEvents);
    } catch (e) {
      setUsageError(getDisplayErrorMessage(e, t("admin.error.load")));
    } finally {
      setUsageLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user) {
      setInitializing(false);
      return;
    }
    let cancelled = false;
    setError("");
    (async () => {
      try {
        const me = await fetchAdminMe();
        if (cancelled) return;
        if (!me.admin) {
          setIsAdmin(false);
          setSummary(null);
          return;
        }
        setIsAdmin(true);
        const nextSummary = await fetchAdminSummary();
        if (cancelled) return;
        setSummary(nextSummary);
        void loadUsage();
      } catch (e) {
        if (!cancelled) setError(getDisplayErrorMessage(e, t("admin.error.load")));
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, t, loadUsage]);

  const loadAccountsPage = useCallback(
    async (page: number, q: string, sort: AdminAccountSort) => {
      setModalLoading(true);
      setModalError("");
      try {
        const data = await fetchAdminAccountsPage(q, page, ACCOUNTS_PAGE_SIZE, sort);
        let nextPage = data.page;
        let rows = data.content;
        let totalPages = data.totalPages;
        let totalEl = data.totalElements;
        if (rows.length === 0 && nextPage > 0 && totalEl > 0) {
          const prev = await fetchAdminAccountsPage(q, nextPage - 1, ACCOUNTS_PAGE_SIZE, sort);
          nextPage = prev.page;
          rows = prev.content;
          totalPages = prev.totalPages;
          totalEl = prev.totalElements;
        }
        setModalPage(nextPage);
        setModalQuery(q);
        setModalSort(sort);
        setModalAccounts(rows);
        setModalTotalPages(totalPages);
        setModalTotalElements(totalEl);
      } catch (e) {
        setModalError(getDisplayErrorMessage(e, t("admin.error.load")));
        setModalAccounts([]);
        setModalTotalPages(0);
        setModalTotalElements(0);
      } finally {
        setModalLoading(false);
      }
    },
    [t],
  );

  const openBrowseAllAccounts = useCallback(() => {
    setSearchNotice("");
    setAccountsModalOpen(true);
    void loadAccountsPage(0, "", modalSort);
  }, [loadAccountsPage, modalSort]);

  const runAccountSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < MIN_ACCOUNT_SEARCH_LEN) {
      setSearchNotice(t("admin.searchMinChars"));
      return;
    }
    setSearchNotice("");
    setAccountsModalOpen(true);
    await loadAccountsPage(0, q, modalSort);
  }, [query, t, loadAccountsPage, modalSort]);

  useEffect(() => {
    if (!accountsModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountsModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountsModalOpen]);

  async function handleDeleteAccount(accountId: number, username: string) {
    const confirmed = window.confirm(
      t("admin.confirm.delete").replace("{{username}}", username),
    );
    if (!confirmed) return;
    setBusyAccountId(accountId);
    setModalError("");
    try {
      await adminDeleteAccount(accountId);
      await loadAccountsPage(modalPage, modalQuery, modalSort);
    } catch (e) {
      setModalError(getDisplayErrorMessage(e, t("admin.error.delete")));
    } finally {
      setBusyAccountId(null);
    }
  }

  function closeAccountsModal() {
    setAccountsModalOpen(false);
    setModalError("");
  }

  if (!isReady) {
    return <div className="p-6 text-zinc-500">{t("admin.loading")}</div>;
  }

  if (!user) {
    return <div className="p-6 text-zinc-500">{t("admin.loginRequired")}</div>;
  }

  if (initializing) {
    return <div className="p-6 text-zinc-500">{t("admin.loading")}</div>;
  }

  if (!isAdmin) {
    return <div className="p-6 text-zinc-500">{t("admin.notAllowed")}</div>;
  }

  const totalPagesUi = Math.max(1, modalTotalPages);
  const currentPageUi = modalTotalElements === 0 ? 1 : modalPage + 1;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
        {t("admin.title")}
      </h1>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label={t("admin.stats.accounts")} value={summary.totalAccounts} locale={locale} />
          <Stat label={t("admin.stats.catches")} value={summary.totalCatches} locale={locale} />
          <Stat label={t("admin.stats.comments")} value={summary.totalComments} locale={locale} />
          <Stat label={t("admin.stats.likes")} value={summary.totalLikes} locale={locale} />
          <Stat label={t("admin.stats.friendships")} value={summary.totalFriendships} locale={locale} />
          <Stat label={t("admin.stats.threads")} value={summary.totalThreads} locale={locale} />
          <Stat label={t("admin.stats.threadComments")} value={summary.totalThreadComments} locale={locale} />
          <Stat label={t("admin.stats.camps")} value={summary.totalCamps} locale={locale} />
          <Stat label={t("admin.stats.verified")} value={summary.verifiedAccounts} locale={locale} />
          <Stat label={t("admin.stats.admins")} value={summary.adminAccounts} locale={locale} />
          <Stat label={t("admin.stats.new7d")} value={summary.newAccounts7d} locale={locale} />
          <Stat label={t("admin.stats.new30d")} value={summary.newAccounts30d} locale={locale} />
        </div>
      )}

<div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {t("admin.searchToStart")}
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void openBrowseAllAccounts()}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
          >
            {t("admin.browseAllAccounts")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (searchNotice) setSearchNotice("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runAccountSearch();
            }}
            placeholder={t("admin.searchPlaceholder")}
            className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            aria-label={t("admin.searchPlaceholder")}
          />
          <button
            type="button"
            onClick={() => void runAccountSearch()}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            {t("admin.search")}
          </button>
        </div>

        {searchNotice && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{searchNotice}</p>
        )}
      </div>

      <section className="rounded-xl border border-zinc-200 p-3 sm:p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="min-w-0 text-base font-semibold text-zinc-900 sm:text-lg dark:text-zinc-50">
            {t("admin.usage.title")}
          </h2>
          <button
            type="button"
            onClick={() => void loadUsage()}
            disabled={usageLoading}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {usageLoading ? t("admin.usage.loading") : t("admin.usage.refresh")}
          </button>
        </div>

        {usageError ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{usageError}</p>
        ) : null}

        {usageSummary && usageSummary.totals.length === 0 && !usageLoading ? (
          <p className="text-sm text-zinc-500">{t("admin.usage.empty")}</p>
        ) : null}

        {usageSummary && usageSummary.totals.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {t("admin.usage.totalsHeading")}
                </h3>
                <ul className="space-y-2">
                  {usageSummary.totals.map((row) => (
                    <li
                      key={row.type}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                    >
                      <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                        {usageTypeLabel(row.type, t)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>
                          <span className="text-zinc-500">{t("admin.usage.table.total")}: </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatAppInteger(row.total, locale)}
                          </span>
                        </span>
                        <span>
                          <span className="text-zinc-500">{t("admin.usage.table.last7d")}: </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatAppInteger(row.last7d, locale)}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {usageSummary.topDetails.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {t("admin.usage.topDetailsHeading")}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {usageSummary.topDetails.map((row) => (
                      <li
                        key={`${row.type}:${row.detail}`}
                        className="flex items-start justify-between gap-3 rounded-md bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-900"
                      >
                        <span className="min-w-0 break-words text-zinc-700 dark:text-zinc-300">
                          <span className="text-zinc-500">{usageTypeLabel(row.type, t)}</span>
                          {" · "}
                          {row.detail}
                        </span>
                        <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
                          {formatAppInteger(row.count, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("admin.usage.recentHeading")}
              </h3>
              {usageEvents.length > 0 ? (
                <ul className="max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-96">
                  {usageEvents.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200">
                          {usageTypeLabel(event.type, t)}
                        </span>
                        <span className="shrink-0 text-[0.7rem] text-zinc-400">
                          {formatUsageTimestamp(event.createdAtEpochMs, locale)}
                        </span>
                      </div>
                      {event.detail ? (
                        <p className="mt-0.5 break-words text-xs text-zinc-600 dark:text-zinc-400">
                          {event.detail}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[0.7rem] text-zinc-500">
                        {event.username ? `@${event.username}` : t("admin.usage.guest")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">{t("admin.usage.empty")}</p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {accountsModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => closeAccountsModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-accounts-dialog-title"
            className="flex max-h-[min(90vh,42rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <h2
                id="admin-accounts-dialog-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {t("admin.accountsDialogTitle")}
              </h2>
              <button
                type="button"
                onClick={() => closeAccountsModal()}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t("admin.accountsDialogClose")}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label
                  htmlFor="admin-accounts-sort"
                  className="text-sm text-zinc-600 dark:text-zinc-400"
                >
                  {t("admin.sortLabel")}
                </label>
                <select
                  id="admin-accounts-sort"
                  value={modalSort}
                  disabled={modalLoading}
                  onChange={(e) => {
                    const next = e.target.value as AdminAccountSort;
                    void loadAccountsPage(0, modalQuery, next);
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="username">{t("admin.sort.username")}</option>
                  <option value="username_desc">{t("admin.sort.usernameDesc")}</option>
                  <option value="newest">{t("admin.sort.newest")}</option>
                  <option value="oldest">{t("admin.sort.oldest")}</option>
                </select>
              </div>
              {modalError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{modalError}</p>
              ) : null}
              {modalLoading ? (
                <p className="py-8 text-sm text-zinc-500">{t("admin.searchingAccounts")}</p>
              ) : modalAccounts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-zinc-500">
                      <tr>
                        <th className="px-2 py-2">{t("admin.table.username")}</th>
                        <th className="px-2 py-2">{t("admin.table.locations")}</th>
                        <th className="px-2 py-2">{t("admin.table.catches")}</th>
                        <th className="px-2 py-2">{t("admin.table.comments")}</th>
                        <th className="px-2 py-2">{t("admin.table.likes")}</th>
                        <th className="px-2 py-2">{t("admin.table.created")}</th>
                        <th className="px-2 py-2">{t("admin.table.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalAccounts.map((account) => (
                        <tr
                          key={account.id}
                          className="border-t border-zinc-200 dark:border-zinc-800"
                        >
                          <td className="px-2 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                            @{account.username}
                          </td>
                          <td className="px-2 py-2">{account.locations}</td>
                          <td className="px-2 py-2">{account.catches}</td>
                          <td className="px-2 py-2">{account.comments}</td>
                          <td className="px-2 py-2">{account.likes}</td>
                          <td className="px-2 py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                            {account.createdAtEpochMs != null
                              ? formatAppShortDate(
                                  new Date(account.createdAtEpochMs).toISOString(),
                                  locale,
                                )
                              : t("admin.table.createdUnknown")}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => void handleDeleteAccount(account.id, account.username)}
                              disabled={busyAccountId === account.id}
                              className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              {busyAccountId === account.id
                                ? t("admin.deleting")
                                : t("admin.deleteAccount")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-sm text-zinc-500">{t("admin.noAccountResults")}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t("admin.accountsPageShort", {
                  current: currentPageUi,
                  totalPages: totalPagesUi,
                })}
                {modalTotalElements > 0
                  ? ` · ${formatAppInteger(modalTotalElements, locale)}`
                  : null}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={modalLoading || modalPage <= 0}
                  onClick={() => void loadAccountsPage(modalPage - 1, modalQuery, modalSort)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t("admin.accountsPrev")}
                </button>
                <button
                  type="button"
                  disabled={modalLoading || modalPage >= modalTotalPages - 1 || modalTotalPages === 0}
                  onClick={() => void loadAccountsPage(modalPage + 1, modalQuery, modalSort)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t("admin.accountsNext")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function usageTypeLabel(
  type: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const key = USAGE_TYPE_LABEL_KEYS[type];
  return key ? t(key) : type;
}

function formatUsageTimestamp(epochMs: number, locale: string): string {
  if (!epochMs) return "-";
  return new Date(epochMs).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stat({ label, value, locale }: { label: string; value: number; locale: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {formatAppInteger(value, locale)}
      </p>
    </div>
  );
}
