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

export default function AdminPage() {
  const { user, isReady } = useAuth();
  const { t } = useLocale();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<AdminAccountRowResponse[]>([]);
  const [summary, setSummary] = useState<AdminSummaryResponse | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const me = await fetchAdminMe();
      if (!me.admin) {
        setIsAdmin(false);
        setSummary(null);
        setAccounts([]);
        return;
      }
      setIsAdmin(true);
      const [nextSummary, nextAccounts] = await Promise.all([
        fetchAdminSummary(),
        fetchAdminAccounts(query, 100),
      ]);
      setSummary(nextSummary);
      setAccounts(nextAccounts);
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("admin.error.load")));
    } finally {
      setLoading(false);
    }
  }, [user, query, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDeleteAccount(accountId: number, username: string) {
    const confirmed = window.confirm(t("admin.confirm.delete").replace("{{username}}", username));
    if (!confirmed) return;
    setBusyAccountId(accountId);
    setError("");
    try {
      await adminDeleteAccount(accountId);
      await load();
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

  if (loading) {
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
        <div className="mb-3 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            {t("admin.search")}
          </button>
        </div>

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
