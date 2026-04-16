"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  adminDeleteAccount,
  fetchAdminAccounts,
  fetchAdminMe,
  fetchAdminSummary,
  getDisplayErrorMessage,
  type AdminAccountRowResponse,
  type AdminSummaryResponse,
} from "@/lib/api";

const MIN_ACCOUNT_SEARCH_LEN = 2;

export default function AdminPage() {
  const { user, isReady } = useAuth();
  const { t } = useLocale();
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchNotice, setSearchNotice] = useState("");
  const [accounts, setAccounts] = useState<AdminAccountRowResponse[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null);

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
          setAccounts([]);
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

  const runAccountSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < MIN_ACCOUNT_SEARCH_LEN) {
      setAccounts([]);
      setHasSearched(false);
      setSearchNotice(t("admin.searchMinChars"));
      return;
    }
    setSearchNotice("");
    setTableLoading(true);
    setError("");
    try {
      const rows = await fetchAdminAccounts(q, 100);
      setAccounts(rows);
      setHasSearched(true);
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("admin.error.load")));
      setAccounts([]);
    } finally {
      setTableLoading(false);
    }
  }, [query, t]);

  async function handleDeleteAccount(accountId: number, username: string) {
    const confirmed = window.confirm(
      t("admin.confirm.delete").replace("{{username}}", username),
    );
    if (!confirmed) return;
    setBusyAccountId(accountId);
    setError("");
    try {
      await adminDeleteAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("admin.error.delete")));
    } finally {
      setBusyAccountId(null);
    }
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
          {t("admin.kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("admin.title")}
        </h1>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label={t("admin.stats.accounts")} value={summary.totalAccounts} />
          <Stat label={t("admin.stats.locations")} value={summary.totalLocations} />
          <Stat label={t("admin.stats.catches")} value={summary.totalCatches} />
          <Stat label={t("admin.stats.comments")} value={summary.totalComments} />
          <Stat label={t("admin.stats.likes")} value={summary.totalLikes} />
          <Stat label={t("admin.stats.friendships")} value={summary.totalFriendships} />
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {t("admin.searchToStart")}
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
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
            disabled={tableLoading}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {t("admin.search")}
          </button>
        </div>

        {searchNotice && (
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">{searchNotice}</p>
        )}

        {tableLoading ? (
          <p className="py-6 text-sm text-zinc-500">{t("admin.searchingAccounts")}</p>
        ) : accounts.length > 0 ? (
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
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-zinc-200 dark:border-zinc-800">
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
        ) : hasSearched ? (
          <p className="py-4 text-sm text-zinc-500">{t("admin.noAccountResults")}</p>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
