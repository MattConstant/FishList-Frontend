"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AchievementsPanel } from "@/components/achievements-panel";
import { LocationCard } from "@/components/fishing-cards";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  ApiHttpError,
  addFriend,
  fetchAccountById,
  fetchMyFriends,
  fetchUserLocations,
  getDisplayErrorMessage,
  removeFriend,
  type AccountResponse,
  type LocationWithCatches,
} from "@/lib/api";

export default function UserProfilePage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { user, isReady } = useAuth();
  const { t } = useLocale();
  const accountId = Number(rawId);
  const invalidId = !Number.isFinite(accountId) || accountId <= 0;

  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [locations, setLocations] = useState<LocationWithCatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [friendBusy, setFriendBusy] = useState(false);

  const load = useCallback(async () => {
    if (invalidId) {
      setError(t("users.invalidId"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [profile, locs] = await Promise.all([
        fetchAccountById(accountId),
        fetchUserLocations(accountId),
      ]);
      setAccount(profile);
      setLocations(locs);
    } catch (e) {
      if (e instanceof ApiHttpError && e.status === 401) {
        setError(t("users.mustLogin"));
      } else {
        setError(getDisplayErrorMessage(e, t("users.loadError")));
      }
      setAccount(null);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, invalidId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) void load();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [load]);

  useEffect(() => {
    if (!user) {
      setFriendIds(new Set());
      return;
    }
    let cancelled = false;
    fetchMyFriends()
      .then((friends) => {
        if (!cancelled) setFriendIds(new Set(friends.map((f) => f.id)));
      })
      .catch(() => {
        if (!cancelled) setFriendIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSelf = user?.id === account?.id;
  const isFriend = account ? friendIds.has(account.id) : false;
  const totalCatches = useMemo(
    () => locations.reduce((sum, l) => sum + l.catches.length, 0),
    [locations],
  );

  async function handleToggleFriend() {
    if (!user || !account || friendBusy || isSelf) return;
    setFriendBusy(true);
    try {
      if (isFriend) {
        await removeFriend(account.id);
        setFriendIds((prev) => {
          const next = new Set(prev);
          next.delete(account.id);
          return next;
        });
      } else {
        await addFriend(account.id);
        setFriendIds((prev) => new Set(prev).add(account.id));
      }
    } finally {
      setFriendBusy(false);
    }
  }

  if (!isReady) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 items-center justify-center px-6 py-16">
        <p className="text-zinc-500">{t("profile.loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      {invalidId && (
        <p className="text-sm text-red-600 dark:text-red-400">{t("users.invalidId")}</p>
      )}

      {!invalidId && error && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
          {error === t("users.mustLogin") && (
            <div className="mt-3">
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900 dark:bg-red-700 dark:hover:bg-red-600"
              >
                {t("nav.login")}
              </Link>
            </div>
          )}
        </div>
      )}

      {!invalidId && !error && loading && (
        <p className="text-zinc-500">{t("users.loadingProfile")}</p>
      )}

      {!invalidId && !error && !loading && account && (
        <div className="overflow-hidden rounded-[28px] border border-zinc-200/90 bg-white/95 shadow-xl shadow-zinc-900/10 backdrop-blur dark:border-zinc-700/90 dark:bg-zinc-900/90">
          <div className="bg-white/95 px-5 pb-8 pt-7 dark:bg-zinc-900/90 sm:px-8 sm:pt-9">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
              <div className="relative shrink-0">
                <UserAvatar
                  accountId={account.id}
                  profileImageKey={account.profileImageKey}
                  size="lg"
                  label={t("home.avatarLabel", { username: account.username })}
                  loadWhenVisible={false}
                />
              </div>

              <div className="flex w-full min-w-0 flex-1 flex-col gap-3 text-center sm:text-left">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {t("users.angler")}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                    @{account.username}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {isSelf ? (
                    <Link
                      href="/profile"
                      className="inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {t("users.editProfile")}
                    </Link>
                  ) : user ? (
                    <button
                      type="button"
                      onClick={() => void handleToggleFriend()}
                      disabled={friendBusy}
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
                        isFriend
                          ? "border border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          : "bg-sky-600 text-white hover:bg-sky-700",
                      ].join(" ")}
                    >
                      {friendBusy
                        ? t("users.friendBusy")
                        : isFriend
                          ? t("users.removeFriend")
                          : t("users.addFriend")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-700">
              <div className="rounded-2xl bg-zinc-50/90 px-3 py-4 text-center dark:bg-zinc-800/60">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("users.locations")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {locations.length}
                </dd>
              </div>
              <div className="rounded-2xl bg-zinc-50/90 px-3 py-4 text-center dark:bg-zinc-800/60">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("users.totalCatches")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {totalCatches}
                </dd>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 px-3 py-4 text-center dark:from-zinc-800/80 dark:to-zinc-900/60">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("users.accountId")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  #{account.id}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {!invalidId && !error && !loading && account && (
        <AchievementsPanel
          accountId={account.id}
          variant="public"
          initialPreviewCount={6}
        />
      )}

      {!invalidId && !error && !loading && account && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {t("users.sectionSpots")}
          </h2>
          {locations.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("users.noCatches")}</p>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <LocationCard key={loc.id} loc={loc} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
