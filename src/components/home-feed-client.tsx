"use client";

import Link from "next/link";
import Image from "next/image";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { CreateThreadDialog } from "@/components/create-thread-dialog";
import { EditPostDialog } from "@/components/edit-post-dialog";
import { PostChooserDialog } from "@/components/post-chooser-dialog";
import { PostImageLightbox } from "@/components/post-image-lightbox";
import { ThreadFeedCard } from "@/components/thread-feed-card";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { LANDING_SESSION_HTML_CLASS } from "@/lib/landing-session-hide";
import {
  fetchMyFriends,
  createCatchComment,
  deleteCatch,
  deleteCatchComment,
  fetchCatchComments,
  fetchCatchLike,
  fetchForumThreads,
  fetchLatestPosts,
  getDisplayErrorMessage,
  getImageUrl,
  loadSession,
  likeCatch,
  unlikeCatch,
  type CatchCommentResponse,
  type FeedPost,
  type ForumThreadPost,
} from "@/lib/api";
import { formatAppShortDate } from "@/lib/format-app-locale";
import { formatLengthFromCm, formatWeightFromKg } from "@/lib/units";

const TOP_COMMENTS_LIMIT = 2;
const COMMENTS_CHUNK_SIZE = 5;
const FEED_PAGE_SIZE = 24;

type HomeFeedItem =
  | { kind: "catch"; key: string; timeStamp: string; post: FeedPost }
  | { kind: "thread"; key: string; timeStamp: string; thread: ForumThreadPost };

function dedupeThreads(list: ForumThreadPost[]): ForumThreadPost[] {
  const seen = new Set<number>();
  const out: ForumThreadPost[] = [];
  for (const thread of list) {
    if (seen.has(thread.id)) continue;
    seen.add(thread.id);
    out.push(thread);
  }
  return out;
}

function mergeFeedItems(
  catches: FeedPost[],
  threads: ForumThreadPost[],
): HomeFeedItem[] {
  const items: HomeFeedItem[] = [
    ...catches.map((post) => ({
      kind: "catch" as const,
      key: `catch-${post.id}`,
      timeStamp: post.timeStamp,
      post,
    })),
    ...threads.map((thread) => ({
      kind: "thread" as const,
      key: `thread-${thread.id}`,
      timeStamp: thread.createdAt,
      thread,
    })),
  ];
  return items.sort((a, b) => b.timeStamp.localeCompare(a.timeStamp));
}

function dedupePosts(list: FeedPost[]): FeedPost[] {
  const seen = new Set<string>();
  const out: FeedPost[] = [];
  for (const p of list) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function visibilityPill(vis: FeedPost["visibility"]) {
  const v = vis ?? "PUBLIC";
  const label = v === "FRIENDS" ? "Friends" : v === "PRIVATE" ? "Private" : "Public";
  const cls =
    v === "FRIENDS"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      : v === "PRIVATE"
        ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function isObjectKey(url: string) {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

function parseCoordLoose(raw: string): number {
  return Number.parseFloat(raw.replace(",", ".").trim());
}

function feedPostMapHref(post: FeedPost): string | null {
  const lat = parseCoordLoose(String(post.latitude ?? ""));
  const lng = parseCoordLoose(String(post.longitude ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const u = new URLSearchParams();
  u.set("lat", String(lat));
  u.set("lng", String(lng));
  const name = String(post.locationName ?? "").trim();
  if (name) u.set("location", name);
  return `/map?${u.toString()}`;
}

const FeedCard = memo(function FeedCard({
  post,
  currentUserId,
  isAdmin,
  priorityImage = false,
  onDeletePost,
  onDeleteError,
  onUpdatePost,
}: {
  post: FeedPost;
  currentUserId?: number;
  isAdmin?: boolean;
  /** First above-the-fold catch photo: load immediately for LCP. */
  priorityImage?: boolean;
  onDeletePost: (postId: string) => void;
  onDeleteError: (message: string) => void;
  onUpdatePost: (updated: FeedPost) => void;
}) {
  const { t, locale } = useLocale();
  const cardRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const cardActive = isActive || priorityImage;
  const isOwnPost = currentUserId != null && post.accountId === currentUserId;
  const imageCandidates = useMemo(
    () =>
      post.catch.imageUrls && post.catch.imageUrls.length > 0
        ? post.catch.imageUrls.slice(0, 4)
        : post.catch.imageUrl
          ? [post.catch.imageUrl]
          : [],
    [post.catch.imageUrls, post.catch.imageUrl],
  );
  const [resolvedUrls, setResolvedUrls] = useState<string[]>(
    imageCandidates.filter((u) => !isObjectKey(u)),
  );
  const [imgError, setImgError] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likesLoading, setLikesLoading] = useState(true);
  const [likesBusy, setLikesBusy] = useState(false);
  const [comments, setComments] = useState<CatchCommentResponse[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsChunkLoading, setCommentsChunkLoading] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  /** Sync guard — React state updates async, so double-clicks can slip past `commentBusy`. */
  const commentSubmitLockRef = useRef(false);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const mapHref = useMemo(() => feedPostMapHref(post), [post]);

  useEffect(() => {
    if (!cardRef.current || cardActive) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px 0px" },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [cardActive]);

  useEffect(() => {
    if (!cardActive) return;
    if (imageCandidates.length === 0) return;
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
  }, [cardActive, imageCandidates]);

  useEffect(() => {
    if (!cardActive) return;
    let cancelled = false;
    fetchCatchLike(post.locationId, post.catch.id)
      .then((res) => {
        if (cancelled) return;
        setLikesCount(res.likesCount);
        setLikedByMe(res.likedByMe);
      })
      .catch(() => {
        if (cancelled) return;
        setLikesCount(0);
        setLikedByMe(false);
      })
      .finally(() => {
        if (!cancelled) setLikesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardActive, post.locationId, post.catch.id]);

  useEffect(() => {
    if (!cardActive) return;
    let cancelled = false;
    fetchCatchComments(post.locationId, post.catch.id, 0, TOP_COMMENTS_LIMIT)
      .then((res) => {
        if (cancelled) return;
        setComments(res.comments);
        setCommentsTotal(res.totalCount);
      })
      .catch(() => {
        if (cancelled) return;
        setComments([]);
        setCommentsTotal(0);
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardActive, post.locationId, post.catch.id]);

  async function loadMoreComments() {
    if (commentsChunkLoading || commentsLoading) return;
    setCommentsExpanded(true);
    setCommentsChunkLoading(true);
    try {
      const res = await fetchCatchComments(
        post.locationId,
        post.catch.id,
        comments.length,
        COMMENTS_CHUNK_SIZE,
      );
      setComments((prev) => [...prev, ...res.comments]);
      setCommentsTotal(res.totalCount);
    } catch {
      // Keep existing loaded comments if this chunk fails.
    } finally {
      setCommentsChunkLoading(false);
    }
  }

  async function toggleLike() {
    if (likesBusy) return;
    setLikesBusy(true);
    const previousLiked = likedByMe;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    setLikedByMe(nextLiked);
    setLikesCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    try {
      const res = nextLiked
        ? await likeCatch(post.locationId, post.catch.id)
        : await unlikeCatch(post.locationId, post.catch.id);
      setLikedByMe(res.likedByMe);
      setLikesCount(res.likesCount);
    } catch {
      setLikedByMe(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setLikesBusy(false);
    }
  }

  async function submitComment() {
    const trimmed = commentMessage.trim();
    if (!trimmed || commentBusy || commentSubmitLockRef.current) return;
    commentSubmitLockRef.current = true;
    setCommentBusy(true);
    try {
      const created = await createCatchComment(
        post.locationId,
        post.catch.id,
        trimmed,
        replyParentId,
      );
      setCommentsTotal((t) => t + 1);
      setComments((prev) => {
        const next = [...prev, created];
        if (commentsExpanded) return next;
        if (next.length <= TOP_COMMENTS_LIMIT) return next;
        // Collapsed peek keeps the last N by id; a new reply has the highest id, which would
        // slice away the parent comment — keep parent + reply together when applicable.
        const parentId = created.parentCommentId;
        if (parentId != null && parentId > 0) {
          const parent = next.find((c) => c.id === parentId);
          if (parent) {
            return [parent, created].sort((a, b) => a.id - b.id);
          }
        }
        return next.slice(-TOP_COMMENTS_LIMIT);
      });
      setCommentMessage("");
      setReplyParentId(null);
      setReplyToUsername(null);
    } catch {
      // Keep UX simple; user can retry.
    } finally {
      commentSubmitLockRef.current = false;
      setCommentBusy(false);
    }
  }

  async function removeComment(commentId: number) {
    if (commentBusy) return;
    setCommentBusy(true);
    const previous = comments;
    const previousTotal = commentsTotal;
    const optimistic = comments.filter(
      (c) => c.id !== commentId && c.parentCommentId !== commentId,
    );
    const removedCount = comments.length - optimistic.length;
    setComments(optimistic);
    setCommentsTotal((t) => Math.max(0, t - removedCount));
    try {
      await deleteCatchComment(post.locationId, post.catch.id, commentId);
    } catch {
      setComments(previous);
      setCommentsTotal(previousTotal);
    } finally {
      setCommentBusy(false);
    }
  }

  async function removePost() {
    if (deletingPost) return;
    if (!isOwnPost && !isAdmin) return;
    const confirmed = window.confirm(t("home.deletePostConfirm"));
    if (!confirmed) return;
    setDeletingPost(true);
    try {
      await deleteCatch(post.locationId, post.catch.id);
      onDeletePost(post.id);
    } catch (e) {
      onDeleteError(getDisplayErrorMessage(e, t("home.deletePostError")));
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <article
      id={`feed-post-${post.id}`}
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={`/users/${post.accountId}`}
            className="shrink-0 self-start pt-0.5"
            aria-label={`@${post.username}`}
          >
            <UserAvatar
              accountId={post.accountId}
              profileImageKey={post.profileImageKey}
              size="md"
              label={t("home.avatarLabel", { username: post.username })}
            />
          </Link>
          <div className="min-w-0">
            <Link
              href={`/users/${post.accountId}`}
              className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
            >
              @{post.username}
            </Link>
            <p className="text-xs text-zinc-500">{formatAppShortDate(post.timeStamp, locale)}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          {mapHref ? (
            <Link
              href={mapHref}
              className="max-w-[10rem] truncate text-right text-xs font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800 hover:decoration-emerald-700 dark:text-emerald-400 dark:decoration-emerald-400/40 dark:hover:text-emerald-300 sm:max-w-[12rem]"
              title={t("home.feedLocationMap")}
            >
              {post.locationName.trim() || t("home.feedLocationMap")}
            </Link>
          ) : post.locationName.trim() ? (
            <p className="max-w-[10rem] truncate text-right text-xs text-zinc-500 sm:max-w-[12rem]">
              {post.locationName}
            </p>
          ) : null}
          {isOwnPost || isAdmin ? visibilityPill(post.visibility) : null}
          {isOwnPost && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t("home.editPost.button")}
            </button>
          )}
          {(isOwnPost || isAdmin) && (
            <button
              type="button"
              onClick={() => void removePost()}
              disabled={deletingPost}
              className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {deletingPost ? t("home.deletingPost") : t("home.deletePost")}
            </button>
          )}
        </div>
      </div>

      <EditPostDialog
        post={post}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={onUpdatePost}
      />

      {imageCandidates.length > 0 ? (
        cardActive && resolvedUrls.length > 0 && !imgError ? (
          <div className={resolvedUrls.length > 1 ? "grid grid-cols-2 gap-1" : ""}>
            {resolvedUrls.map((url, imageIndex) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightboxIndex(imageIndex)}
                className="relative aspect-square w-full cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                aria-label={t("home.imageLightbox.open")}
              >
                <Image
                  src={url}
                  alt={post.catch.species}
                  fill
                  className="object-cover transition hover:opacity-95"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={priorityImage && imageIndex === 0}
                  loading={priorityImage && imageIndex === 0 ? "eager" : "lazy"}
                  unoptimized
                  onError={() => setImgError(true)}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <p className="text-sm text-zinc-400">Loading image…</p>
          </div>
        )
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <span className="text-5xl">🐟</span>
        </div>
      )}

      {lightboxIndex != null && resolvedUrls.length > 0 ? (
        <PostImageLightbox
          urls={resolvedUrls}
          index={lightboxIndex}
          alt={post.catch.species}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          labels={{
            close: t("home.imageLightbox.close"),
            prev: t("home.imageLightbox.prev"),
            next: t("home.imageLightbox.next"),
            imageOf: t("home.imageLightbox.imageOf"),
          }}
        />
      ) : null}

      <div className="space-y-1 px-4 py-3">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          {post.catch.species}
        </p>
        {post.catch.description?.trim() ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{post.catch.description}</p>
        ) : null}
        {post.catch.fishingType && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
            <span aria-hidden>🎣</span>
            {t(`catch.fishingType.${post.catch.fishingType.toLowerCase()}`)}
          </span>
        )}
        {post.catch.fishDetails && post.catch.fishDetails.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {post.catch.fishDetails.map((f, i) => {
              const measureBits = [
                formatLengthFromCm(f.lengthCm),
                formatWeightFromKg(f.weightKg),
              ].filter(Boolean);
              return (
                <li key={i}>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{f.species}</span>
                  {measureBits.length > 0 ? ` · ${measureBits.join(" · ")}` : null}
                  {f.notes ? (
                    <span className="mt-0.5 block text-zinc-500 dark:text-zinc-500">
                      {f.notes}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {[
                post.catch.quantity && post.catch.quantity > 1
                  ? `×${post.catch.quantity}`
                  : null,
                formatLengthFromCm(post.catch.lengthCm),
                formatWeightFromKg(post.catch.weightKg),
              ]
                .filter(Boolean)
                .join(" · ") || "No measurements"}
            </p>
            {post.catch.notes && (
              <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                {post.catch.notes}
              </p>
            )}
          </>
        )}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => void toggleLike()}
            disabled={likesBusy || likesLoading}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
              likedByMe
                ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
              likesBusy || likesLoading ? "opacity-70" : "",
            ].join(" ")}
            aria-label={likedByMe ? "Unlike this post" : "Like this post"}
            title={likedByMe ? "Unlike" : "Like"}
          >
            <span>{likedByMe ? "❤️" : "🤍"}</span>
            <span>
              {likesLoading
                ? "..."
                : `${likesCount} ${likesCount === 1 ? "like" : "likes"}`}
            </span>
          </button>
        </div>
        <div className="pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("home.comments.title")}
          </p>
          {commentsLoading ? (
            <p className="mt-1 text-sm text-zinc-400">{t("home.comments.loading")}</p>
          ) : comments.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">{t("home.comments.empty")}</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {comments.map((comment) => {
                const isReply =
                  comment.parentCommentId != null && comment.parentCommentId > 0;
                return (
                  <div
                    key={comment.id}
                    className={[
                      "rounded-lg bg-zinc-100 px-2.5 py-2 text-sm dark:bg-zinc-800",
                      isReply ? "ml-4 border-l-2 border-sky-400/80 pl-3" : "",
                    ].join(" ")}
                  >
                    {isReply && comment.inReplyToUsername ? (
                      <p className="mb-1 text-[11px] font-medium text-sky-700 dark:text-sky-400">
                        {t("home.comment.replyingTo", {
                          username: comment.inReplyToUsername,
                        })}
                      </p>
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 gap-2">
                        <Link
                          href={`/users/${comment.accountId}`}
                          className="shrink-0 pt-0.5"
                          aria-label={`@${comment.username}`}
                        >
                          <UserAvatar
                            accountId={comment.accountId}
                            profileImageKey={comment.profileImageKey}
                            size="sm"
                            label={t("home.avatarLabel", {
                              username: comment.username,
                            })}
                          />
                        </Link>
                        <p className="min-w-0 flex-1">
                          <Link
                            href={`/users/${comment.accountId}`}
                            className="font-semibold text-zinc-800 hover:underline dark:text-zinc-200"
                          >
                            @{comment.username}
                          </Link>{" "}
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {comment.message}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {!isReply ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyParentId(comment.id);
                              setReplyToUsername(comment.username);
                            }}
                            className="text-[11px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                          >
                            {t("home.comment.reply")}
                          </button>
                        ) : null}
                        {comment.ownedByMe && (
                          <button
                            type="button"
                            onClick={() => void removeComment(comment.id)}
                            disabled={commentBusy}
                            className="text-xs text-zinc-500 hover:text-red-500 disabled:opacity-60"
                            title={t("home.comment.delete")}
                            aria-label={t("home.comment.delete")}
                          >
                            {t("home.comment.delete")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!commentsLoading && commentsTotal > comments.length && (
            <button
              type="button"
              onClick={() => void loadMoreComments()}
              disabled={commentsChunkLoading}
              className="mt-2 text-xs font-medium text-sky-600 transition hover:underline disabled:opacity-60 dark:text-sky-400"
            >
              {commentsChunkLoading
                ? t("home.comments.loadMoreLoading")
                : commentsExpanded
                  ? t("home.comments.loadMore", {
                      n: commentsTotal - comments.length,
                    })
                  : t("home.comments.loadMorePeek", {
                      n: commentsTotal - comments.length,
                    })}
            </button>
          )}

          {replyParentId != null && replyToUsername ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs dark:border-sky-900/40 dark:bg-sky-950/40">
              <span className="font-medium text-sky-900 dark:text-sky-200">
                {t("home.comment.replyingTo", { username: replyToUsername })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReplyParentId(null);
                  setReplyToUsername(null);
                }}
                className="shrink-0 font-semibold text-sky-700 underline dark:text-sky-400"
              >
                {t("home.comment.cancelReply")}
              </button>
            </div>
          ) : null}

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={commentMessage}
              onChange={(e) => setCommentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                void submitComment();
              }}
              placeholder={t("home.comment.placeholder")}
              maxLength={500}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void submitComment()}
              disabled={commentBusy || !commentMessage.trim()}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {t("home.comment.post")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

function HomeFeed() {
  const { user, isReady, isAdmin, connectionIssueKey } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const focusPostId = searchParams.get("post");
  const focusThreadIdRaw = searchParams.get("thread");
  const focusThreadId =
    focusThreadIdRaw != null && /^\d+$/.test(focusThreadIdRaw)
      ? Number.parseInt(focusThreadIdRaw, 10)
      : null;
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [threads, setThreads] = useState<ForumThreadPost[]>([]);
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [feedScope, setFeedScope] = useState<"all" | "friends" | "mine">("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreCatches, setHasMoreCatches] = useState(true);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [postChooserOpen, setPostChooserOpen] = useState(false);
  const [createThreadOpen, setCreateThreadOpen] = useState(false);
  const [error, setError] = useState("");
  const hasMore = hasMoreCatches || hasMoreThreads;
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const focusExpandDoneRef = useRef(false);
  const focusScrollKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const shouldHideLanding = !!user || (!isReady && !!loadSession());
    document.documentElement.classList.toggle(
      LANDING_SESSION_HTML_CLASS,
      shouldHideLanding,
    );
  }, [user, isReady]);

  useEffect(() => {
    focusExpandDoneRef.current = false;
    focusScrollKeyRef.current = null;
  }, [focusPostId, focusThreadId]);

  const handleDeletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleDeleteThread = useCallback((threadId: number) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
  }, []);

  const handleDeleteError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleUpdatePost = useCallback((updated: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handleUpdateThread = useCallback((updated: ForumThreadPost) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === updated.id ? updated : thread)),
    );
  }, []);

  const handleThreadCreated = useCallback((thread: ForumThreadPost) => {
    setThreads((prev) => dedupeThreads([thread, ...prev]));
  }, []);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [nextPosts, nextThreads] = await Promise.all([
        fetchLatestPosts(FEED_PAGE_SIZE, 0),
        fetchForumThreads(FEED_PAGE_SIZE, 0),
      ]);
      setPosts(dedupePosts(nextPosts));
      setThreads(dedupeThreads(nextThreads));
      setHasMoreCatches(nextPosts.length === FEED_PAGE_SIZE);
      setHasMoreThreads(nextThreads.length === FEED_PAGE_SIZE);
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("home.loadLatestError")));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const [nextPosts, nextThreads] = await Promise.all([
        hasMoreCatches
          ? fetchLatestPosts(FEED_PAGE_SIZE, posts.length)
          : Promise.resolve([] as FeedPost[]),
        hasMoreThreads
          ? fetchForumThreads(FEED_PAGE_SIZE, threads.length)
          : Promise.resolve([] as ForumThreadPost[]),
      ]);
      if (hasMoreCatches) {
        setPosts((prev) => dedupePosts([...prev, ...nextPosts]));
        setHasMoreCatches(nextPosts.length === FEED_PAGE_SIZE);
      }
      if (hasMoreThreads) {
        setThreads((prev) => dedupeThreads([...prev, ...nextThreads]));
        setHasMoreThreads(nextThreads.length === FEED_PAGE_SIZE);
      }
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("home.loadMoreError")));
    } finally {
      setLoadingMore(false);
    }
  }, [
    user,
    loadingMore,
    loading,
    hasMore,
    hasMoreCatches,
    hasMoreThreads,
    posts.length,
    threads.length,
    t,
  ]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!user) {
      setFriendIds(new Set());
      return;
    }
    let cancelled = false;
    fetchMyFriends()
      .then((friends) => {
        if (cancelled) return;
        setFriendIds(new Set(friends.map((f) => f.id)));
      })
      .catch(() => {
        if (!cancelled) setFriendIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;
    if (!user || feedScope !== "all" || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (loading || loadingMore || !hasMore) return;
        void loadMore();
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [user, feedScope, hasMore, loading, loadingMore, loadMore]);

  const visibleItems = useMemo(() => {
    const merged = mergeFeedItems(posts, threads);
    if (!user) return merged;
    if (feedScope === "mine") {
      return merged.filter((item) =>
        item.kind === "catch"
          ? item.post.accountId === user.id
          : item.thread.accountId === user.id,
      );
    }
    if (feedScope === "friends") {
      return merged.filter((item) =>
        item.kind === "catch"
          ? friendIds.has(item.post.accountId)
          : friendIds.has(item.thread.accountId),
      );
    }
    return merged;
  }, [posts, threads, feedScope, friendIds, user]);

  const lcpFeedPostKey = useMemo(() => {
    for (const item of visibleItems) {
      if (item.kind !== "catch") continue;
      const c = item.post.catch;
      const hasImages =
        (c.imageUrls != null && c.imageUrls.length > 0) ||
        (c.imageUrl != null && c.imageUrl.trim() !== "");
      if (hasImages) return item.key;
    }
    return null;
  }, [visibleItems]);

  // Deep link: show the post/thread in the "all" feed and widen the first fetch if needed.
  useEffect(() => {
    if ((!focusPostId && focusThreadId == null) || !user) return;
    setFeedScope("all");
  }, [focusPostId, focusThreadId, user]);

  useEffect(() => {
    if ((!focusPostId && focusThreadId == null) || !user) return;
    if (focusExpandDoneRef.current) return;
    const found =
      (focusPostId != null && posts.some((p) => p.id === focusPostId)) ||
      (focusThreadId != null && threads.some((t) => t.id === focusThreadId));
    if (found) return;
    focusExpandDoneRef.current = true;
    void (async () => {
      try {
        const [rows, threadRows] = await Promise.all([
          fetchLatestPosts(120, 0),
          fetchForumThreads(120, 0),
        ]);
        setPosts(dedupePosts(rows));
        setThreads(dedupeThreads(threadRows));
        setHasMoreCatches(rows.length === 120);
        setHasMoreThreads(threadRows.length === 120);
      } catch {
        focusExpandDoneRef.current = false;
      }
    })();
  }, [focusPostId, focusThreadId, user, posts, threads]);

  useEffect(() => {
    const focusKey =
      focusPostId ?? (focusThreadId != null ? `thread-${focusThreadId}` : null);
    if (!focusKey) {
      focusScrollKeyRef.current = null;
      return;
    }
    const isVisible =
      (focusPostId &&
        visibleItems.some(
          (item) => item.kind === "catch" && item.post.id === focusPostId,
        )) ||
      (focusThreadId != null &&
        visibleItems.some(
          (item) => item.kind === "thread" && item.thread.id === focusThreadId,
        ));
    if (!isVisible) return;
    if (focusScrollKeyRef.current === focusKey) return;
    const el = document.getElementById(
      focusPostId
        ? `feed-post-${focusPostId}`
        : `feed-thread-${focusThreadId}`,
    );
    if (!el) return;
    focusScrollKeyRef.current = focusKey;
    requestAnimationFrame(() => {
      // scrollIntoView can scroll the window / outer flex shell and shove the sticky nav off-screen.
      // Only scroll the app <main> (the real scroll container).
      const main = el.closest("main");
      if (main) {
        const pad = 12;
        const elRect = el.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        const nextTop = main.scrollTop + (elRect.top - mainRect.top) - pad;
        main.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      el.classList.add(
        "ring-2",
        "ring-sky-500",
        "ring-offset-2",
        "ring-offset-zinc-50",
        "dark:ring-offset-zinc-950",
      );
      window.setTimeout(() => {
        el.classList.remove(
          "ring-2",
          "ring-sky-500",
          "ring-offset-2",
          "ring-offset-zinc-50",
          "dark:ring-offset-zinc-950",
        );
      }, 2200);
    });
  }, [focusPostId, focusThreadId, visibleItems]);

  if (!isReady) {
    return null;
  }

  if (!user) {
    if (connectionIssueKey) {
      return (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
            {t("errors.accountLoadFailed")}
          </p>
          <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            {t("errors.offlineHomeHint")}
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
            {t("home.kicker")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {t("home.title")}
          </h1>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex max-w-full min-w-0 flex-wrap rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-600 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setFeedScope("all")}
              className={[
                "rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5",
                feedScope === "all"
                  ? "bg-sky-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              {t("home.scope.all")}
            </button>
            <button
              type="button"
              onClick={() => setFeedScope("friends")}
              className={[
                "rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5",
                feedScope === "friends"
                  ? "bg-sky-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              {t("home.scope.friends")}
            </button>
            <button
              type="button"
              onClick={() => setFeedScope("mine")}
              className={[
                "rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5",
                feedScope === "mine"
                  ? "bg-sky-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              {t("home.scope.mine")}
            </button>
          </div>

          <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => void loadFeed()}
              disabled={loading}
              className="min-h-11 flex-1 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 sm:min-h-0 sm:flex-initial dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {loading ? t("home.refreshing") : t("home.refresh")}
            </button>
            <button
              type="button"
              onClick={() => setPostChooserOpen(true)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-700 sm:min-h-0 sm:flex-initial"
            >
              {t("home.post")}
            </button>
          </div>
        </div>
      </div>

      <PostChooserDialog
        open={postChooserOpen}
        onClose={() => setPostChooserOpen(false)}
        onStartDiscussion={() => setCreateThreadOpen(true)}
      />
      <CreateThreadDialog
        open={createThreadOpen}
        onClose={() => setCreateThreadOpen(false)}
        onCreated={handleThreadCreated}
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && visibleItems.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
          {feedScope === "friends"
            ? t("home.noPosts.friends")
            : feedScope === "mine"
              ? t("home.noPosts.mine")
              : t("home.noPosts.all")}
        </p>
      )}

      <div className="space-y-4">
        {visibleItems.map((item) =>
          item.kind === "catch" ? (
            <FeedCard
              key={item.key}
              post={item.post}
              currentUserId={user.id}
              isAdmin={isAdmin}
              priorityImage={item.key === lcpFeedPostKey}
              onDeletePost={handleDeletePost}
              onDeleteError={handleDeleteError}
              onUpdatePost={handleUpdatePost}
            />
          ) : (
            <ThreadFeedCard
              key={item.key}
              thread={item.thread}
              currentUserId={user.id}
              isAdmin={isAdmin}
              focusComments={focusThreadId === item.thread.id}
              onDeleteThread={handleDeleteThread}
              onDeleteError={handleDeleteError}
              onUpdateThread={handleUpdateThread}
            />
          ),
        )}
      </div>

      {hasMore && feedScope === "all" && (
        <div ref={loadMoreSentinelRef} className="pt-2 text-center">
          {loadingMore ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("home.loadingMore")}</p>
          ) : (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t("home.loadMore")}</p>
          )}
        </div>
      )}

      {!loading && !error && visibleItems.length > 0 && (!hasMore || feedScope !== "all") && (
        <div className="pt-2 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{t("home.reachedBottom")}</p>
        </div>
      )}
    </div>
  );
}

export function HomeFeedClient() {
  return (
    <Suspense fallback={null}>
      <HomeFeed />
    </Suspense>
  );
}
