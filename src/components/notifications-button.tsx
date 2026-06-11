"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchMyFriends,
  fetchCatchComments,
  fetchCatchLike,
  fetchLatestPosts,
  fetchCommentReplyNotifications,
  fetchForumThreadComments,
  fetchForumThreads,
  fetchThreadCommentReplyNotifications,
  type FeedPost,
} from "@/lib/api";

type NotificationKind = "comment" | "like" | "friend" | "reply";

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  postId?: string;
  locationId?: number;
  catchId?: number;
  threadId?: number;
  createdAtMs: number;
  message: string;
  href: string;
};

type StoredNotifState = {
  /** Last time the user opened the panel (used to suppress old items). */
  lastSeenAtMs: number;
  /** Per-post snapshot so we can detect new likes/comments without server-side events. */
  byPost: Record<
    string,
    {
      likesCount?: number;
      seenCommentIds?: number[];
    }
  >;
  /** Snapshot of friend ids to detect newly-added friends without server events. */
  friendIds?: number[];
  /** Notification ids the user marked as read (UI-only). */
  readIds?: string[];
  /** Reply comment ids already surfaced or suppressed (dedupe / first-load snapshot). */
  seenReplyCommentIds?: number[];
  /** Per-thread snapshot for discussion notifications. */
  byThread?: Record<
    string,
    {
      likesCount?: number;
      commentsCount?: number;
      seenCommentIds?: number[];
    }
  >;
  seenThreadReplyCommentIds?: number[];
};

const STORAGE_KEY = "fishlist-notifications-v1";
const NOTIF_CATCH_POSTS_LIMIT = 15;
const NOTIF_THREAD_POLL_LIMIT = 12;
const NOTIF_FEED_FETCH_LIMIT = 40;

function safeParseState(raw: string | null): StoredNotifState {
  if (!raw) return { lastSeenAtMs: 0, byPost: {} };
  try {
    const parsedUnknown = JSON.parse(raw) as unknown;
    if (!parsedUnknown || typeof parsedUnknown !== "object") {
      return { lastSeenAtMs: 0, byPost: {} };
    }

    const parsed = parsedUnknown as Record<string, unknown>;
    const lastSeenAtMs = typeof parsed.lastSeenAtMs === "number" ? parsed.lastSeenAtMs : 0;
    const byPost =
      parsed.byPost && typeof parsed.byPost === "object"
        ? (parsed.byPost as StoredNotifState["byPost"])
        : {};

    const seenReplyCommentIds = Array.isArray(parsed.seenReplyCommentIds)
      ? (parsed.seenReplyCommentIds as unknown[]).filter((x): x is number => typeof x === "number")
      : undefined;

    const byThread =
      parsed.byThread && typeof parsed.byThread === "object"
        ? (parsed.byThread as StoredNotifState["byThread"])
        : {};
    const seenThreadReplyCommentIds = Array.isArray(parsed.seenThreadReplyCommentIds)
      ? (parsed.seenThreadReplyCommentIds as unknown[]).filter(
          (x): x is number => typeof x === "number",
        )
      : undefined;

    return { lastSeenAtMs, byPost, seenReplyCommentIds, byThread, seenThreadReplyCommentIds };
  } catch {
    return { lastSeenAtMs: 0, byPost: {} };
  }
}

function formatRelativeShort(msAgo: number): string {
  const s = Math.max(0, Math.floor(msAgo / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

async function mapWithConcurrency<T, R>(
  list: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let idx = 0;
  const workers = new Array(Math.max(1, Math.min(limit, list.length))).fill(0).map(async () => {
    while (idx < list.length) {
      const current = idx++;
      out[current] = await fn(list[current]);
    }
  });
  await Promise.all(workers);
  return out;
}

function toMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function postCatchKey(p: FeedPost): { postId: string; locationId: number; catchId: number } {
  return { postId: p.id, locationId: p.locationId, catchId: p.catch.id };
}

/** Deep-link to home feed card (`FeedPost.id` is `${locationId}-${catchId}`). */
function feedThreadHref(threadId?: number): string {
  if (threadId == null || !Number.isFinite(threadId)) return "/";
  return `/?thread=${threadId}`;
}

function feedPostHref(postId?: string, locationId?: number, catchId?: number): string {
  const id =
    postId ??
    (locationId != null &&
    catchId != null &&
    Number.isFinite(locationId) &&
    Number.isFinite(catchId)
      ? `${locationId}-${catchId}`
      : null);
  if (!id) return "/";
  return `/?post=${encodeURIComponent(id)}`;
}

export function NotificationsButton() {
  const { user, isReady } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  /** Bumps when localStorage readIds change so `readIds` memo recomputes (Mark read / tap row). */
  const [readEpoch, setReadEpoch] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pollInFlightRef = useRef(false);

  const canRun = isReady && !!user;

  const readIds = useMemo(() => {
    if (typeof window === "undefined") return new Set<string>();
    void open;
    void readEpoch;
    const state = safeParseState(localStorage.getItem(STORAGE_KEY));
    return new Set<string>(state.readIds ?? []);
  }, [open, readEpoch]);

  const unreadCount = useMemo(
    () => items.filter((i) => !readIds.has(i.id)).length,
    [items, readIds],
  );

  const bellBtnClass =
    "relative flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 active:bg-zinc-200/80 md:h-10 md:w-10 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700/80";

  const badge = unreadCount > 0 ? (
    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold leading-none text-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  ) : null;

  const emptyState = (
    <div className="px-3 py-8 text-center">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">No notifications yet</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Likes, comments, discussion replies, and new friends will show up here.
      </p>
    </div>
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 20),
    [items],
  );

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function pollOnce(): Promise<void> {
    if (!canRun) return;
    if (typeof window === "undefined") return;
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    setBusy(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const state = safeParseState(raw);

      // Friends: detect newly-added friend ids.
      const prevFriendIds = new Set<number>(state.friendIds ?? []);
      const friends = await fetchMyFriends().catch(() => []);
      const nextFriendIds = friends.map((f) => f.id).filter((id) => Number.isFinite(id));
      const newFriendItems: NotificationItem[] = [];
      for (const f of friends) {
        if (!Number.isFinite(f.id)) continue;
        if (prevFriendIds.size === 0) continue; // first run: snapshot only (avoid a big burst)
        if (prevFriendIds.has(f.id)) continue;
        newFriendItems.push({
          id: `friend:${f.id}`,
          kind: "friend",
          createdAtMs: Date.now(),
          message: `@${f.username} added you as a friend.`,
          href: `/users/${f.id}`,
        });
      }

      const replies = await fetchCommentReplyNotifications(30).catch(() => []);
      const prevSeenReply = new Set<number>(state.seenReplyCommentIds ?? []);
      /** Only true before we've ever persisted reply ids (empty array = baseline already taken). */
      const firstReplySnapshot = state.seenReplyCommentIds === undefined;
      const newReplyItems: NotificationItem[] = [];
      for (const r of replies) {
        if (!Number.isFinite(r.replyCommentId)) continue;
        if (prevSeenReply.has(r.replyCommentId)) continue;
        const createdAtMs = toMs(r.createdAt);
        if (firstReplySnapshot) {
          prevSeenReply.add(r.replyCommentId);
          continue;
        }
        if (state.lastSeenAtMs && createdAtMs && createdAtMs <= state.lastSeenAtMs) {
          prevSeenReply.add(r.replyCommentId);
          continue;
        }
        newReplyItems.push({
          id: `reply:${r.replyCommentId}`,
          kind: "reply",
          locationId: r.locationId,
          catchId: r.catchId,
          createdAtMs: createdAtMs || Date.now(),
          message: `@${r.replierUsername} replied to your comment: ${r.messagePreview}`,
          href: feedPostHref(undefined, r.locationId, r.catchId),
        });
        prevSeenReply.add(r.replyCommentId);
      }

      const threadReplies = await fetchThreadCommentReplyNotifications(30).catch(() => []);
      const prevSeenThreadReply = new Set<number>(state.seenThreadReplyCommentIds ?? []);
      const firstThreadReplySnapshot = state.seenThreadReplyCommentIds === undefined;
      for (const r of threadReplies) {
        if (!Number.isFinite(r.replyCommentId)) continue;
        if (prevSeenThreadReply.has(r.replyCommentId)) continue;
        const createdAtMs = toMs(r.createdAt);
        if (firstThreadReplySnapshot) {
          prevSeenThreadReply.add(r.replyCommentId);
          continue;
        }
        if (state.lastSeenAtMs && createdAtMs && createdAtMs <= state.lastSeenAtMs) {
          prevSeenThreadReply.add(r.replyCommentId);
          continue;
        }
        newReplyItems.push({
          id: `thread-reply:${r.replyCommentId}`,
          kind: "reply",
          threadId: r.threadId,
          createdAtMs: createdAtMs || Date.now(),
          message: `@${r.replierUsername} replied on "${r.threadTitle}": ${r.messagePreview}`,
          href: feedThreadHref(r.threadId),
        });
        prevSeenThreadReply.add(r.replyCommentId);
      }

      // Limit work: only look at the most recent posts by the current user.
      const feed = await fetchLatestPosts(NOTIF_FEED_FETCH_LIMIT);
      const myPosts = feed
        .filter((p) => p.accountId === user!.id)
        .slice(0, NOTIF_CATCH_POSTS_LIMIT);

      const catchResults = await mapWithConcurrency(myPosts, 6, async (p) => {
        const { postId, locationId, catchId } = postCatchKey(p);
        const prev = state.byPost[postId] ?? {};
        const isFirstCommentSnapshotForPost = prev.seenCommentIds === undefined;

        const [like, commentsPage] = await Promise.all([
          fetchCatchLike(locationId, catchId).catch(() => null),
          // Newest comments first — asc(0,6) was the six *oldest*, so new activity never appeared.
          fetchCatchComments(locationId, catchId, 0, 6, "desc").catch(() => null),
        ]);

        const nextLikeCount = like?.likesCount ?? prev.likesCount ?? 0;
        const nextSeenCommentIds = new Set<number>(prev.seenCommentIds ?? []);

        const newItems: NotificationItem[] = [];

        // Likes: no per-like timestamp available, so treat increases since last snapshot as a new notification.
        if (like && typeof prev.likesCount === "number" && like.likesCount > prev.likesCount) {
          const delta = like.likesCount - prev.likesCount;
          newItems.push({
            id: `like:${postId}:${like.likesCount}`,
            kind: "like",
            postId,
            locationId,
            catchId,
            createdAtMs: Date.now(),
            message: `Your post got ${delta} new ${delta === 1 ? "like" : "likes"}.`,
            href: feedPostHref(postId, locationId, catchId),
          });
        }

        // Comments: we can use the comment id + createdAt.
        if (commentsPage) {
          for (const c of commentsPage.comments) {
            if (isFirstCommentSnapshotForPost) {
              nextSeenCommentIds.add(c.id);
              continue;
            }
            if (c.ownedByMe) continue;
            if (
              c.parentCommentId != null &&
              c.inReplyToUsername &&
              user!.username.toLowerCase() === c.inReplyToUsername.toLowerCase()
            ) {
              nextSeenCommentIds.add(c.id);
              continue;
            }
            if (nextSeenCommentIds.has(c.id)) continue;
            const createdAtMs = toMs(c.createdAt);
            // Don’t surface comments that happened before the user ever opened notifications.
            if (state.lastSeenAtMs && createdAtMs && createdAtMs <= state.lastSeenAtMs) {
              nextSeenCommentIds.add(c.id);
              continue;
            }
            newItems.push({
              id: `comment:${postId}:${c.id}`,
              kind: "comment",
              postId,
              locationId,
              catchId,
              createdAtMs: createdAtMs || Date.now(),
              message: `@${c.username} commented: ${c.message}`,
              href: feedPostHref(postId, locationId, catchId),
            });
            // mark seen so we don’t spam duplicates
            nextSeenCommentIds.add(c.id);
          }
        }

        return {
          postId,
          nextLikesCount: nextLikeCount,
          nextSeenCommentIds: Array.from(nextSeenCommentIds).slice(0, 50),
          newItems,
        };
      });

      const threadFeed = await fetchForumThreads(NOTIF_FEED_FETCH_LIMIT).catch(() => []);
      const myThreads = threadFeed
        .filter((t) => t.accountId === user!.id)
        .slice(0, NOTIF_THREAD_POLL_LIMIT);

      const threadResults = await mapWithConcurrency(myThreads, 4, async (thread) => {
        const threadKey = `thread:${thread.id}`;
        const prev = state.byThread?.[threadKey] ?? {};
        const isFirstSnapshot = prev.seenCommentIds === undefined;
        const feedLikes = thread.likesCount ?? prev.likesCount ?? 0;
        const feedComments = thread.commentsCount ?? prev.commentsCount ?? 0;
        const nextSeenCommentIds = new Set<number>(prev.seenCommentIds ?? []);
        const newItems: NotificationItem[] = [];

        if (!isFirstSnapshot && typeof prev.likesCount === "number" && feedLikes > prev.likesCount) {
          const delta = feedLikes - prev.likesCount;
          newItems.push({
            id: `thread-like:${thread.id}:${feedLikes}`,
            kind: "like",
            threadId: thread.id,
            createdAtMs: Date.now(),
            message: `Your discussion "${thread.title}" got ${delta} new ${delta === 1 ? "like" : "likes"}.`,
            href: feedThreadHref(thread.id),
          });
        }

        const shouldFetchComments =
          feedComments > 0 &&
          (isFirstSnapshot || feedComments > (prev.commentsCount ?? 0));

        if (shouldFetchComments) {
          const commentsPage = await fetchForumThreadComments(
            thread.id,
            0,
            6,
            "desc",
          ).catch(() => null);

          if (commentsPage) {
            for (const c of commentsPage.comments) {
              if (isFirstSnapshot) {
                nextSeenCommentIds.add(c.id);
                continue;
              }
              if (c.ownedByMe) continue;
              if (
                c.parentCommentId != null &&
                c.inReplyToUsername &&
                user!.username.toLowerCase() === c.inReplyToUsername.toLowerCase()
              ) {
                nextSeenCommentIds.add(c.id);
                continue;
              }
              if (nextSeenCommentIds.has(c.id)) continue;
              const createdAtMs = toMs(c.createdAt);
              if (state.lastSeenAtMs && createdAtMs && createdAtMs <= state.lastSeenAtMs) {
                nextSeenCommentIds.add(c.id);
                continue;
              }
              newItems.push({
                id: `thread-comment:${thread.id}:${c.id}`,
                kind: "comment",
                threadId: thread.id,
                createdAtMs: createdAtMs || Date.now(),
                message: `@${c.username} commented on "${thread.title}": ${c.message}`,
                href: feedThreadHref(thread.id),
              });
              nextSeenCommentIds.add(c.id);
            }
          }
        }

        return {
          threadKey,
          nextLikesCount: feedLikes,
          nextCommentsCount: feedComments,
          nextSeenCommentIds: Array.from(nextSeenCommentIds).slice(0, 50),
          newItems,
        };
      });

      const nextState: StoredNotifState = {
        ...state,
        byPost: { ...state.byPost },
        byThread: { ...(state.byThread ?? {}) },
        friendIds: nextFriendIds,
        seenReplyCommentIds: Array.from(prevSeenReply).slice(0, 200),
        seenThreadReplyCommentIds: Array.from(prevSeenThreadReply).slice(0, 200),
      };

      const discovered: NotificationItem[] = [];
      discovered.push(...newFriendItems);
      discovered.push(...newReplyItems);
      for (const r of catchResults) {
        discovered.push(...r.newItems);
        nextState.byPost[r.postId] = {
          likesCount: r.nextLikesCount,
          seenCommentIds: r.nextSeenCommentIds,
        };
      }
      for (const r of threadResults) {
        discovered.push(...r.newItems);
        nextState.byThread![r.threadKey] = {
          likesCount: r.nextLikesCount,
          commentsCount: r.nextCommentsCount,
          seenCommentIds: r.nextSeenCommentIds,
        };
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));

      if (discovered.length > 0) {
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const merged = [...discovered.filter((x) => !seen.has(x.id)), ...prev];
          return merged.slice(0, 50);
        });
      }
    } finally {
      pollInFlightRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!canRun) return;
    void pollOnce();

    const interval = window.setInterval(() => void pollOnce(), 45_000);
    const onFocus = () => void pollOnce();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, user?.id]);

  function persistReadIds(nextRead: Set<string>) {
    if (typeof window === "undefined") return;
    const state = safeParseState(localStorage.getItem(STORAGE_KEY));
    const next: StoredNotifState = {
      ...state,
      readIds: Array.from(nextRead),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReadEpoch((e) => e + 1);
  }

  function markAllRead() {
    if (typeof window === "undefined") return;
    const state = safeParseState(localStorage.getItem(STORAGE_KEY));
    const nextRead = new Set<string>(state.readIds ?? []);
    for (const it of items) nextRead.add(it.id);
    const next: StoredNotifState = {
      ...state,
      lastSeenAtMs: Date.now(),
      readIds: Array.from(nextRead),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReadEpoch((e) => e + 1);
  }

  function markOneRead(id: string) {
    if (typeof window === "undefined") return;
    const state = safeParseState(localStorage.getItem(STORAGE_KEY));
    const nextRead = new Set<string>(state.readIds ?? []);
    nextRead.add(id);
    persistReadIds(nextRead);
  }

  if (!isReady) {
    return <div className="h-11 w-11 shrink-0 md:h-10 md:w-10" aria-hidden />;
  }
  if (!user) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={bellBtnClass}
        aria-label="Notifications"
        title="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            // If opening, immediately refresh so the panel feels live.
            void pollOnce();
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0"
          />
        </svg>
        {badge}
      </button>

      {open ? (
        <div className="absolute right-0 z-[1200] mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void pollOnce()}
                disabled={busy}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {busy ? "Refreshing…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40"
              >
                Mark read
              </button>
            </div>
          </div>

          <div className="max-h-[min(65vh,26rem)] overflow-y-auto">
            {sortedItems.length === 0 ? (
              emptyState
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-900" role="list">
                {sortedItems.map((n) => (
                  (() => {
                    const isRead = readIds.has(n.id);
                    return (
                  <li key={n.id} className="px-3 py-3">
                    <Link
                      href={n.href}
                      className={[
                        "block rounded-xl p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-900",
                        isRead ? "opacity-70" : "bg-sky-50/60 dark:bg-sky-950/20",
                      ].join(" ")}
                      onClick={() => {
                        markOneRead(n.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={[
                            "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm",
                            n.kind === "comment"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : n.kind === "reply"
                                ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                                : n.kind === "friend"
                                  ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
                          ].join(" ")}
                          aria-hidden
                        >
                          {n.kind === "comment"
                            ? "💬"
                            : n.kind === "reply"
                              ? "↩"
                              : n.kind === "friend"
                                ? "👥"
                                : "♥"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-800 dark:text-zinc-100">{n.message}</p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatRelativeShort(Date.now() - n.createdAtMs)} ago
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                    );
                  })()
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

