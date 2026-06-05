"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  adminDeleteAccount,
  fetchAdminAccountsPage,
  fetchAdminMe,
  fetchAdminSummary,
  getDisplayErrorMessage,
  type AdminAccountRowResponse,
  type AdminSummaryResponse,
} from "@/lib/api";
import { formatAppInteger } from "@/lib/format-app-locale";

const MIN_ACCOUNT_SEARCH_LEN = 2;
const ACCOUNTS_PAGE_SIZE = 25;

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

  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [modalPage, setModalPage] = useState(0);
  const [modalAccounts, setModalAccounts] = useState<AdminAccountRowResponse[]>([]);
  const [modalTotalPages, setModalTotalPages] = useState(0);
  const [modalTotalElements, setModalTotalElements] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

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
      } catch (e) {
        if (!cancelled) setError(getDisplayErrorMessage(e, t("admin.error.load")));
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  const loadAccountsPage = useCallback(
    async (page: number, q: string) => {
      setModalLoading(true);
      setModalError("");
      try {
        const data = await fetchAdminAccountsPage(q, page, ACCOUNTS_PAGE_SIZE);
        let nextPage = data.page;
        let rows = data.content;
        let totalPages = data.totalPages;
        let totalEl = data.totalElements;
        if (rows.length === 0 && nextPage > 0 && totalEl > 0) {
          const prev = await fetchAdminAccountsPage(q, nextPage - 1, ACCOUNTS_PAGE_SIZE);
          nextPage = prev.page;
          rows = prev.content;
          totalPages = prev.totalPages;
          totalEl = prev.totalElements;
        }
        setModalPage(nextPage);
        setModalQuery(q);
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
    void loadAccountsPage(0, "");
  }, [loadAccountsPage]);

  const runAccountSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < MIN_ACCOUNT_SEARCH_LEN) {
      setSearchNotice(t("admin.searchMinChars"));
      return;
    }
    setSearchNotice("");
    setAccountsModalOpen(true);
    await loadAccountsPage(0, q);
  }, [query, t, loadAccountsPage]);

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
      await loadAccountsPage(modalPage, modalQuery);
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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("admin.title")}
      </h1>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label={t("admin.stats.accounts")} value={summary.totalAccounts} locale={locale} />
          <Stat label={t("admin.stats.locations")} value={summary.totalLocations} locale={locale} />
          <Stat label={t("admin.stats.catches")} value={summary.totalCatches} locale={locale} />
          <Stat label={t("admin.stats.comments")} value={summary.totalComments} locale={locale} />
          <Stat label={t("admin.stats.likes")} value={summary.totalLikes} locale={locale} />
          <Stat label={t("admin.stats.friendships")} value={summary.totalFriendships} locale={locale} />
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
                  onClick={() => void loadAccountsPage(modalPage - 1, modalQuery)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {t("admin.accountsPrev")}
                </button>
                <button
                  type="button"
                  disabled={modalLoading || modalPage >= modalTotalPages - 1 || modalTotalPages === 0}
                  onClick={() => void loadAccountsPage(modalPage + 1, modalQuery)}
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
