"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  addFriend,
  fetchAccountById,
  fetchMyFriends,
  fetchUserLocations,
  getDisplayErrorMessage,
  getImageUrl,
  removeFriend,
  type CatchResponse,
  type LocationWithCatches,
  type AccountResponse,
} from "@/lib/api";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function isObjectKey(url: string) {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

function CatchCard({ c }: { c: CatchResponse }) {
  const [open, setOpen] = useState(false);
  const imageCandidates = useMemo(
    () =>
      c.imageUrls && c.imageUrls.length > 0
        ? c.imageUrls.slice(0, 4)
        : c.imageUrl
          ? [c.imageUrl]
          : [],
    [c.imageUrls, c.imageUrl],
  );
  const [resolvedUrls, setResolvedUrls] = useState<string[]>(
    imageCandidates.filter((u) => !isObjectKey(u)),
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!open || imageCandidates.length === 0) return;
    let cancelled = false;
    Promise.all(
      imageCandidates.map(async (value) => {
        if (!isObjectKey(value)) return value;
        return getImageUrl(value);
      }),
    )
      .then((urls) => {
        if (!cancelled) setResolvedUrls(urls.filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setImgError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, imageCandidates]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-2xl">🐟</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
            {c.species}
          </p>
          <p className="text-xs text-zinc-500">
            {[
              c.quantity && c.quantity > 1 ? `x${c.quantity}` : null,
              c.lengthCm ? `${c.lengthCm} cm` : null,
              c.weightKg ? `${c.weightKg} kg` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No measurements"}
          </p>
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t border-zinc-100 px-4 py-3 text-sm dark:border-zinc-800">
          {c.notes && <p className="text-zinc-700 dark:text-zinc-300">{c.notes}</p>}
          {c.description && (
            <p className="text-zinc-700 dark:text-zinc-300">{c.description}</p>
          )}
          {imageCandidates.length > 0 && !imgError && (
            resolvedUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {resolvedUrls.map((url) => (
                  <Image
                    key={url}
                    src={url}
                    alt={c.species}
                    width={800}
                    height={600}
                    className="max-h-[280px] w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                    unoptimized
                    onError={() => setImgError(true)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">Loading image...</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({ loc }: { loc: LocationWithCatches }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg dark:bg-sky-900/40">
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
            {loc.locationName}
          </p>
          <p className="text-xs text-zinc-500">
            {formatDate(loc.timeStamp)} · {loc.catches.length} catches
          </p>
        </div>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-zinc-200 px-5 pb-5 pt-4 dark:border-zinc-800">
          {loc.catches.length === 0 ? (
            <p className="text-sm text-zinc-500">No catches recorded.</p>
          ) : (
            loc.catches.map((c) => <CatchCard key={c.id} c={c} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { user, isReady } = useAuth();
  const { t } = useLocale();
  const accountId = Number(rawId);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [locations, setLocations] = useState<LocationWithCatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [friendBusy, setFriendBusy] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(accountId)) {
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
      setError(getDisplayErrorMessage(e, t("users.loadError")));
    } finally {
      setLoading(false);
    }
  }, [accountId, t]);

  useEffect(() => {
    void load();
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
    if (!account || friendBusy || isSelf) return;
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
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("nav.profile")}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {t("users.mustLogin")}
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && loading && <p className="text-zinc-500">{t("users.loadingProfile")}</p>}
      {!error && !loading && account && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
                {t("users.angler")}
              </p>
              <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                @{account.username}
              </h1>
            </div>
            {!isSelf && (
              <button
                type="button"
                onClick={() => void handleToggleFriend()}
                disabled={friendBusy}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold transition",
                  isFriend
                    ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    : "bg-sky-600 text-white hover:bg-sky-700",
                ].join(" ")}
              >
                {friendBusy ? "Working..." : isFriend ? "Unfriend" : "Add friend"}
              </button>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Locations
              </dt>
              <dd className="mt-1 text-lg text-zinc-900 dark:text-zinc-50">
                {locations.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Total Catches
              </dt>
              <dd className="mt-1 text-lg text-zinc-900 dark:text-zinc-50">
                {totalCatches}
              </dd>
            </div>
          </dl>

          <section className="mt-8 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {t("users.catches")}
            </h2>
            {locations.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("users.noCatches")}</p>
            ) : (
              locations.map((loc) => <LocationCard key={loc.id} loc={loc} />)
            )}
          </section>
        </>
      )}
    </div>
  );
}
