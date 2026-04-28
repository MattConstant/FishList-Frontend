"use client";

import Link from "next/link";
import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HomeLandingPage from "@/components/home-landing-page";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  fetchMyFriends,
  createCatchComment,
  deleteCatch,
  deleteCatchComment,
  fetchCatchComments,
  fetchCatchLike,
  fetchLatestPosts,
  getDisplayErrorMessage,
  getImageUrl,
  likeCatch,
  unlikeCatch,
  type CatchCommentResponse,
  type FeedPost,
} from "@/lib/api";

const TOP_COMMENTS_LIMIT = 2;
const COMMENTS_CHUNK_SIZE = 5;
const FEED_PAGE_SIZE = 24;

function formatDate(iso: string) {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Date(parsed).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isObjectKey(url: string) {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

const FeedCard = memo(function FeedCard({
  post,
  currentUserId,
  isAdmin,
  onDeletePost,
  onDeleteError,
}: {
  post: FeedPost;
  currentUserId?: number;
  isAdmin?: boolean;
  onDeletePost: (postId: string) => void;
  onDeleteError: (message: string) => void;
}) {
  const { t } = useLocale();
  const cardRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);
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
  const [deletingPost, setDeletingPost] = useState(false);

  useEffect(() => {
    if (!cardRef.current || isActive) return;
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
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, imageCandidates]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, post.locationId, post.catch.id]);

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, post.locationId, post.catch.id]);

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
    if (!trimmed || commentBusy) return;
    setCommentBusy(true);
    try {
      const created = await createCatchComment(
        post.locationId,
        post.catch.id,
        trimmed,
      );
      setCommentsTotal((t) => t + 1);
      setComments((prev) => {
        const next = [created, ...prev];
        return commentsExpanded ? next : next.slice(0, TOP_COMMENTS_LIMIT);
      });
      setCommentMessage("");
    } catch {
      // Keep UX simple; user can retry.
    } finally {
      setCommentBusy(false);
    }
  }

  async function removeComment(commentId: number) {
    if (commentBusy) return;
    setCommentBusy(true);
    const previous = comments;
    const previousTotal = commentsTotal;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentsTotal((t) => Math.max(0, t - 1));
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
            <p className="text-xs text-zinc-500">{formatDate(post.timeStamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-500">{post.locationName}</p>
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

      {imageCandidates.length > 0 ? (
        isActive && resolvedUrls.length > 0 && !imgError ? (
          <div className={resolvedUrls.length > 1 ? "grid grid-cols-2 gap-1" : ""}>
            {resolvedUrls.map((url) => (
              <div key={url} className="relative aspect-square w-full">
                <Image
                  src={url}
                  alt={post.catch.species}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="lazy"
                  unoptimized
                  onError={() => setImgError(true)}
                />
              </div>
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

      <div className="space-y-1 px-4 py-3">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          {post.catch.species}
        </p>
        {post.catch.fishDetails && post.catch.fishDetails.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {post.catch.fishDetails.map((f, i) => {
              const measureBits = [
                f.lengthCm != null ? `${f.lengthCm} cm` : null,
                f.weightKg != null ? `${f.weightKg} kg` : null,
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
                post.catch.lengthCm ? `${post.catch.lengthCm} cm` : null,
                post.catch.weightKg ? `${post.catch.weightKg} kg` : null,
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
            Comments
          </p>
          {commentsLoading ? (
            <p className="mt-1 text-sm text-zinc-400">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">No comments yet.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg bg-zinc-100 px-2.5 py-2 text-sm dark:bg-zinc-800"
                >
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
                    {comment.ownedByMe && (
                      <button
                        type="button"
                        onClick={() => void removeComment(comment.id)}
                        disabled={commentBusy}
                        className="shrink-0 text-xs text-zinc-500 hover:text-red-500 disabled:opacity-60"
                        title="Delete comment"
                        aria-label="Delete comment"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                ? "Loading more comments..."
                : commentsExpanded
                  ? `Load more comments (${commentsTotal - comments.length} left)`
                  : `View more comments (${commentsTotal - comments.length})`}
            </button>
          )}

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={commentMessage}
              onChange={(e) => setCommentMessage(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void submitComment()}
              disabled={commentBusy || !commentMessage.trim()}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

export default function HomePage() {
  const { user, isReady, isAdmin } = useAuth();
  const { t } = useLocale();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [feedScope, setFeedScope] = useState<"all" | "friends" | "mine">("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const handleDeletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleDeleteError = useCallback((message: string) => {
    setError(message);
  }, []);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const nextPosts = await fetchLatestPosts(FEED_PAGE_SIZE, 0);
      setPosts(nextPosts);
      setHasMore(nextPosts.length === FEED_PAGE_SIZE);
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
      const next = await fetchLatestPosts(FEED_PAGE_SIZE, posts.length);
      setPosts((prev) => [...prev, ...next]);
      setHasMore(next.length === FEED_PAGE_SIZE);
    } catch (e) {
      setError(getDisplayErrorMessage(e, t("home.loadMoreError")));
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, loading, hasMore, posts.length, t]);

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

  const visiblePosts = useMemo(() => {
    if (!user) return posts;
    if (feedScope === "mine") {
      return posts.filter((post) => post.accountId === user.id);
    }
    if (feedScope === "friends") {
      return posts.filter((post) => friendIds.has(post.accountId));
    }
    return posts;
  }, [posts, feedScope, friendIds, user]);

  if (!isReady) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-16">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <HomeLandingPage />;
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
            <Link
              href="/map"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-700 sm:min-h-0 sm:flex-initial"
            >
              {t("home.addCatch")}
            </Link>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && visiblePosts.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
          {feedScope === "friends"
            ? t("home.noPosts.friends")
            : feedScope === "mine"
              ? t("home.noPosts.mine")
              : t("home.noPosts.all")}
        </p>
      )}

      <div className="space-y-4">
        {visiblePosts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            currentUserId={user.id}
            isAdmin={isAdmin}
            onDeletePost={handleDeletePost}
            onDeleteError={handleDeleteError}
          />
        ))}
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

      {!loading && !error && visiblePosts.length > 0 && (!hasMore || feedScope !== "all") && (
        <div className="pt-2 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{t("home.reachedBottom")}</p>
        </div>
      )}
    </div>
  );
}
