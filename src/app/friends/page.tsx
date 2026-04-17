"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  addFriend,
  fetchMyFriends,
  removeFriend,
  searchAccounts,
  type AccountResponse,
} from "@/lib/api";

/** Limits how often we hit /api/accounts/search while typing (was firing every keystroke ≥2 chars). */
const SEARCH_DEBOUNCE_MS = 320;

export default function FriendsPage() {
  const { user, isReady } = useAuth();
  const { t } = useLocale();
  const [friends, setFriends] = useState<AccountResponse[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountResponse[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      return;
    }
    setLoadingFriends(true);
    fetchMyFriends()
      .then((list) => setFriends(list))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }, [user]);

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const q = query.trim();
    let stale = false;

    const timer = window.setTimeout(() => {
      setSearching(true);
      searchAccounts(q)
        .then((list) => {
          if (!stale) setResults(list);
        })
        .catch(() => {
          if (!stale) setResults([]);
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      stale = true;
      window.clearTimeout(timer);
      setSearching(false);
    };
  }, [query, user]);

  const friendIds = useMemo(
    () => new Set(friends.map((f) => f.id)),
    [friends],
  );

  async function onAdd(account: AccountResponse) {
    if (busyId != null) return;
    setBusyId(account.id);
    try {
      await addFriend(account.id);
      setFriends((prev) =>
        prev.some((f) => f.id === account.id) ? prev : [...prev, account],
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(account: AccountResponse) {
    if (busyId != null) return;
    setBusyId(account.id);
    try {
      await removeFriend(account.id);
      setFriends((prev) => prev.filter((f) => f.id !== account.id));
    } finally {
      setBusyId(null);
    }
  }

  if (!isReady) {
    return (
      <div className="mx-auto flex max-w-3xl flex-1 items-center justify-center px-6 py-16">
        <p className="text-zinc-500">{t("friends.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("friends.title")}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {t("friends.requireLogin")}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-fit items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
          {t("friends.kicker")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("friends.title")}
        </h1>
      </div>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {t("friends.find")}
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("friends.searchPlaceholder")}
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <div className="mt-3 space-y-2">
          {searching && <p className="text-sm text-zinc-500">{t("friends.searching")}</p>}
          {!searching &&
            results.map((account) => {
              const isFriend = friendIds.has(account.id);
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                >
                  <Link
                    href={`/users/${account.id}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    @{account.username}
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      void (isFriend ? onRemove(account) : onAdd(account))
                    }
                    disabled={busyId === account.id}
                    className={[
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      isFriend
                        ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        : "bg-sky-600 text-white hover:bg-sky-700",
                    ].join(" ")}
                  >
                    {busyId === account.id
                      ? t("friends.working")
                      : isFriend
                        ? t("friends.unfriend")
                        : t("friends.add")}
                  </button>
                </div>
              );
            })}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {t("friends.myFriends")}
        </p>
        {loadingFriends ? (
          <p className="mt-2 text-sm text-zinc-500">{t("friends.loadingFriends")}</p>
        ) : friends.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            {t("friends.empty")}
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              >
                <Link
                  href={`/users/${friend.id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  @{friend.username}
                </Link>
                <button
                  type="button"
                  onClick={() => void onRemove(friend)}
                  disabled={busyId === friend.id}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {busyId === friend.id ? t("friends.removing") : t("friends.unfriend")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
