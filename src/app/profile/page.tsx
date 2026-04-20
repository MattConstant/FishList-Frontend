"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocationCard } from "@/components/fishing-cards";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  fetchUserLocations,
  getDisplayErrorMessage,
  getImageUrl,
  patchMyProfile,
  saveSession,
  uploadImage,
  validateImageFileForUpload,
  type AccountUpdateResponse,
  type LocationWithCatches,
} from "@/lib/api";
import { tryMapUsernameHttpError, validateUsernameClient } from "@/lib/username-policy";

export default function ProfilePage() {
  const { user, logout, isReady, refreshUser } = useAuth();
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [locations, setLocations] = useState<LocationWithCatches[]>([]);
  const [catchesLoading, setCatchesLoading] = useState(false);
  const [catchesError, setCatchesError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const loadCatches = useCallback(async () => {
    if (!user) return;
    setCatchesLoading(true);
    setCatchesError("");
    try {
      const locs = await fetchUserLocations(user.id);
      setLocations(locs);
    } catch (e) {
      setCatchesError(getDisplayErrorMessage(e, t("profile.failedLoad")));
    } finally {
      setCatchesLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void loadCatches();
  }, [loadCatches]);

  /** Deleted posts on the feed were still visible here when the API response was cached or the tab was restored from bfcache. */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void loadCatches();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) void loadCatches();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [loadCatches]);

  useEffect(() => {
    if (!user) return;
    setNameDraft(user.username);
  }, [user]);

  useEffect(() => {
    if (!user?.profileImageKey) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    getImageUrl(user.profileImageKey)
      .then((url) => {
        if (!cancelled) setAvatarUrl(url);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.profileImageKey]);

  const syncSessionAfterPatch = useCallback(
    async (data: AccountUpdateResponse) => {
      saveSession({
        username: data.account.username,
        authorizationHeader: `${data.tokenType} ${data.accessToken}`,
      });
      await refreshUser();
    },
    [refreshUser],
  );

  async function refreshProfile() {
    setRefreshError("");
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (e) {
      setRefreshError(getDisplayErrorMessage(e, t("profile.failedRefresh")));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSaveUsername() {
    if (!user) return;
    const next = nameDraft.trim();
    if (next === user.username) {
      setEditingName(false);
      return;
    }
    const clientIssue = validateUsernameClient(next, user.username);
    if (clientIssue === "reserved") {
      setActionError(t("validation.usernameReserved"));
      return;
    }
    if (clientIssue === "inappropriate") {
      setActionError(t("validation.usernameInappropriate"));
      return;
    }
    setActionError("");
    setShowSaved(false);
    setNameBusy(true);
    try {
      const data = await patchMyProfile({ username: next });
      await syncSessionAfterPatch(data);
      setEditingName(false);
      setShowSaved(true);
    } catch (e) {
      const mapped = tryMapUsernameHttpError(e, t);
      setActionError(mapped ?? getDisplayErrorMessage(e, t("profile.usernameError")));
    } finally {
      setNameBusy(false);
    }
  }

  async function handlePhotoSelected(fileList: FileList | null) {
    if (!user || !fileList?.length) return;
    const file = fileList[0];
    setActionError("");
    setShowSaved(false);
    setPhotoBusy(true);
    try {
      validateImageFileForUpload(file);
      const uploaded = await uploadImage(file);
      const data = await patchMyProfile({ profileImageKey: uploaded.objectKey });
      await syncSessionAfterPatch(data);
      setShowSaved(true);
    } catch (e) {
      const msg = getDisplayErrorMessage(e, t("profile.photoError"));
      const storageLikelyOff =
        msg.toLowerCase().includes("503") ||
        msg.toLowerCase().includes("not configured") ||
        msg.toLowerCase().includes("disabled");
      setActionError(storageLikelyOff ? t("profile.storageUnavailable") : msg);
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    if (!user) return;
    setActionError("");
    setShowSaved(false);
    setPhotoBusy(true);
    try {
      const data = await patchMyProfile({ profileImageKey: "" });
      await syncSessionAfterPatch(data);
      setShowSaved(true);
    } catch (e) {
      setActionError(getDisplayErrorMessage(e, t("profile.photoError")));
    } finally {
      setPhotoBusy(false);
    }
  }

  if (!isReady) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <p className="text-center text-zinc-500">{t("profile.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("profile.title")}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {t("profile.notSignedIn")}
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

  const totalCatches = locations.reduce((sum, l) => sum + l.catches.length, 0);

  return (
    <div className="relative min-h-full flex-1">
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6">
        <div className="overflow-hidden rounded-[28px] border border-zinc-200/90 bg-white/95 shadow-xl shadow-zinc-900/10 backdrop-blur dark:border-zinc-700/90 dark:bg-zinc-900/90">
          <div className="bg-white/95 px-5 pb-8 pt-7 dark:bg-zinc-900/90 sm:px-8 sm:pt-9">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
              <div className="relative shrink-0">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-zinc-200 bg-zinc-100 shadow-lg ring-2 ring-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-zinc-700/80 sm:h-36 sm:w-36">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={t("profile.avatarAlt")}
                      width={144}
                      height={144}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-5xl" aria-hidden>
                      🎣
                    </span>
                  )}
                </div>
                {photoBusy && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <svg
                      className="h-8 w-8 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5 pt-3 sm:pt-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {t("profile.title")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t("profile.tagline")}
                  </p>
                </div>

                {editingName ? (
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="sr-only" htmlFor="profile-username-input">
                      {t("profile.username")}
                    </label>
                    <input
                      id="profile-username-input"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      autoComplete="username"
                      className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base font-semibold text-zinc-900 outline-none ring-sky-500/50 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                      maxLength={100}
                    />
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveUsername()}
                        disabled={nameBusy}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                      >
                        {nameBusy ? t("profile.savingUsername") : t("profile.saveUsername")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setNameDraft(user.username);
                        }}
                        className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {t("profile.cancelEdit")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      @{user.username}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-zinc-600 dark:text-sky-300 dark:hover:bg-zinc-800"
                    >
                      {t("profile.editUsername")}
                    </button>
                  </div>
                )}
                <p className="mt-0.5 text-xs text-zinc-500">{t("profile.usernameHint")}</p>

                <div className="flex flex-wrap gap-2 pt-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/heic,.jpg,.jpeg,.png,.gif,.webp,.heic"
                    className="sr-only"
                    onChange={(e) => void handlePhotoSelected(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoBusy}
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {t("profile.changePhoto")}
                  </button>
                  {user.profileImageKey ? (
                    <button
                      type="button"
                      onClick={() => void handleRemovePhoto()}
                      disabled={photoBusy}
                      className="rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {t("profile.removePhoto")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-700">
              <div className="rounded-2xl bg-zinc-50/90 px-3 py-4 text-center dark:bg-zinc-800/60">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("profile.locations")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {locations.length}
                </dd>
              </div>
              <div className="rounded-2xl bg-zinc-50/90 px-3 py-4 text-center dark:bg-zinc-800/60">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("profile.totalCatches")}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {totalCatches}
                </dd>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 px-3 py-4 text-center dark:from-sky-950/50 dark:to-indigo-950/40">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800/80 dark:text-sky-300/90">
                  {t("profile.accountId")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  #{user.id}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {(actionError || showSaved) && (
          <div className="rounded-xl px-1">
            {actionError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
            ) : (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{t("profile.saved")}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshProfile()}
            disabled={refreshing}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {refreshing ? t("profile.refreshing") : t("profile.refresh")}
          </button>
          <button
            type="button"
            onClick={() => void loadCatches()}
            disabled={catchesLoading}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {catchesLoading ? t("profile.loading") : t("profile.reloadCatches")}
          </button>
        </div>
        {refreshError && (
          <p className="text-sm text-red-600 dark:text-red-400">{refreshError}</p>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("profile.myCatches")}
            </h2>
          </div>

          {catchesLoading && locations.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <svg
                className="h-8 w-8 animate-spin text-sky-600"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
          )}

          {catchesError && (
            <p className="text-sm text-red-600 dark:text-red-400">{catchesError}</p>
          )}

          {!catchesLoading && !catchesError && locations.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              {t("profile.noCatches")}
            </p>
          )}

          {locations.length > 0 && (
            <div className="space-y-3">
              {locations.map((loc) => (
                <LocationCard key={loc.id} loc={loc} />
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full rounded-xl border border-zinc-300 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {t("profile.logout")}
        </button>
      </div>
    </div>
  );
}
