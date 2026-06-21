"use client";

import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { EditThreadDialog } from "@/components/edit-thread-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { VisibilityPill } from "@/components/visibility-pill";
import { useLocale } from "@/contexts/locale-context";
import {
  createForumThreadComment,
  deleteForumThread,
  deleteForumThreadComment,
  fetchForumThreadComments,
  fetchForumThreadLike,
  getDisplayErrorMessage,
  likeForumThread,
  unlikeForumThread,
  type ForumThreadCommentResponse,
  type ForumThreadPost,
} from "@/lib/api";
import { formatAppRelativeTime, formatAppShortDate } from "@/lib/format-app-locale";

const TOP_COMMENTS_LIMIT = 3;
const COMMENTS_CHUNK_SIZE = 8;

export const ThreadFeedCard = memo(function ThreadFeedCard({
  thread,
  currentUserId,
  isAdmin,
  focusComments = false,
  onDeleteThread,
  onDeleteError,
  onUpdateThread,
}: {
  thread: ForumThreadPost;
  currentUserId?: number;
  isAdmin?: boolean;
  focusComments?: boolean;
  onDeleteThread: (threadId: number) => void;
  onDeleteError: (message: string) => void;
  onUpdateThread: (thread: ForumThreadPost) => void;
}) {
  const { t, locale } = useLocale();
  const cardRef = useRef<HTMLElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isActive, setIsActive] = useState(focusComments);
  const cardActive = isActive || focusComments;
  const isOwnPost = currentUserId != null && thread.accountId === currentUserId;
  const [likesCount, setLikesCount] = useState(thread.likesCount ?? 0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likesBusy, setLikesBusy] = useState(false);
  const [comments, setComments] = useState<ForumThreadCommentResponse[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsTotal, setCommentsTotal] = useState(thread.commentsCount ?? 0);
  const [commentsExpanded, setCommentsExpanded] = useState(
    focusComments || (thread.commentsCount ?? 0) > 0,
  );
  const [commentsChunkLoading, setCommentsChunkLoading] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const commentSubmitLockRef = useRef(false);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!cardRef.current || cardActive) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [cardActive]);

  useEffect(() => {
    if (!cardActive) return;
    let cancelled = false;
    setLikesLoading(true);
    fetchForumThreadLike(thread.id)
      .then((res) => {
        if (cancelled) return;
        setLikesCount(res.likesCount);
        setLikedByMe(res.likedByMe);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLikesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardActive, thread.id]);

  useEffect(() => {
    if (!cardActive) return;
    let cancelled = false;
    setCommentsLoading(true);
    fetchForumThreadComments(thread.id, 0, TOP_COMMENTS_LIMIT)
      .then((res) => {
        if (cancelled) return;
        setComments(res.comments);
        setCommentsTotal(res.totalCount);
      })
      .catch(() => {
        if (cancelled) return;
        setComments([]);
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardActive, thread.id]);

  useEffect(() => {
    if (!focusComments) return;
    commentInputRef.current?.focus();
  }, [focusComments]);

  async function loadMoreComments() {
    if (commentsChunkLoading || commentsLoading) return;
    setCommentsExpanded(true);
    setCommentsChunkLoading(true);
    try {
      const res = await fetchForumThreadComments(
        thread.id,
        comments.length,
        COMMENTS_CHUNK_SIZE,
      );
      setComments((prev) => [...prev, ...res.comments]);
      setCommentsTotal(res.totalCount);
    } catch {
      // keep existing
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
        ? await likeForumThread(thread.id)
        : await unlikeForumThread(thread.id);
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
      const created = await createForumThreadComment(
        thread.id,
        trimmed,
        replyParentId,
      );
      setCommentsTotal((n) => n + 1);
      setCommentsExpanded(true);
      setComments((prev) => {
        const next = [...prev, created];
        if (commentsExpanded) return next;
        if (next.length <= TOP_COMMENTS_LIMIT) return next;
        const parentId = created.parentCommentId;
        if (parentId != null && parentId > 0) {
          const parent = prev.find((c) => c.id === parentId);
          if (parent) {
            return [...prev.filter((c) => c.id !== parentId), parent, created].slice(
              -TOP_COMMENTS_LIMIT,
            );
          }
        }
        return next.slice(-TOP_COMMENTS_LIMIT);
      });
      setCommentMessage("");
      setReplyParentId(null);
      setReplyToUsername(null);
      onUpdateThread({
        ...thread,
        commentsCount: (thread.commentsCount ?? commentsTotal) + 1,
      });
    } catch {
      // ignore
    } finally {
      commentSubmitLockRef.current = false;
      setCommentBusy(false);
    }
  }

  async function removeComment(commentId: number) {
    if (commentBusy) return;
    setCommentBusy(true);
    try {
      await deleteForumThreadComment(thread.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsTotal((n) => Math.max(0, n - 1));
      onUpdateThread({
        ...thread,
        commentsCount: Math.max(0, (thread.commentsCount ?? commentsTotal) - 1),
      });
    } catch {
      // ignore
    } finally {
      setCommentBusy(false);
    }
  }

  async function removeThread() {
    if (deletingPost) return;
    if (!window.confirm(t("home.deleteThreadConfirm"))) return;
    setDeletingPost(true);
    try {
      await deleteForumThread(thread.id);
      onDeleteThread(thread.id);
    } catch (e) {
      onDeleteError(getDisplayErrorMessage(e, t("home.deleteThreadError")));
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <>
      <article
        ref={cardRef}
        id={`feed-thread-${thread.id}`}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href={`/users/${thread.accountId}`}
              className="shrink-0"
              aria-label={`@${thread.username}`}
            >
              <UserAvatar
                accountId={thread.accountId}
                size="md"
                label={t("home.avatarLabel", { username: thread.username })}
              />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/users/${thread.accountId}`}
                  className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  @{thread.username}
                </Link>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                  {t("home.thread.badge")}
                </span>
                {isOwnPost || isAdmin ? <VisibilityPill visibility={thread.visibility} /> : null}
              </div>
              <p className="text-xs text-zinc-500">
                {formatAppShortDate(thread.createdAt, locale)}
              </p>
            </div>
          </div>
          {isOwnPost || isAdmin ? (
            <div className="flex shrink-0 flex-col items-end gap-1">
              {isOwnPost ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  {t("home.editThread.button")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void removeThread()}
                disabled={deletingPost}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
              >
                {deletingPost ? t("home.deletingPost") : t("home.deletePost")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {thread.title}
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {thread.body}
          </p>
        </div>

        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
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
            >
              <span>{likedByMe ? "❤️" : "🤍"}</span>
              <span>
              {likesLoading && cardActive
                ? "..."
                : `${likesCount} ${likesCount === 1 ? t("home.thread.like") : t("home.thread.likes")}`}
              </span>
            </button>
            <span className="text-xs text-zinc-500">
              {commentsTotal === 1
                ? t("home.thread.commentCount", { n: commentsTotal })
                : t("home.thread.commentsCount", { n: commentsTotal })}
            </span>
          </div>

          <div className="pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("home.thread.discussion")}
            </p>
            {!cardActive ? (
              <p className="mt-1 text-sm text-zinc-400">{t("home.comments.loading")}</p>
            ) : commentsLoading ? (
              <p className="mt-1 text-sm text-zinc-400">{t("home.comments.loading")}</p>
            ) : comments.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">{t("home.thread.beFirst")}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {comments.map((comment) => {
                  const isReply =
                    comment.parentCommentId != null && comment.parentCommentId > 0;
                  return (
                    <div
                      key={comment.id}
                      className={[
                        "rounded-lg bg-zinc-100 px-2.5 py-2 text-sm dark:bg-zinc-800",
                        isReply ? "ml-4 border-l-2 border-violet-400/80 pl-3" : "",
                      ].join(" ")}
                    >
                      {isReply && comment.inReplyToUsername ? (
                        <p className="mb-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
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
                              size="sm"
                              label={t("home.avatarLabel", {
                                username: comment.username,
                              })}
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <p className="min-w-0">
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
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {formatAppRelativeTime(comment.createdAt, locale)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {!isReply ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyParentId(comment.id);
                                setReplyToUsername(comment.username);
                                commentInputRef.current?.focus();
                              }}
                              className="text-[11px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                            >
                              {t("home.comment.reply")}
                            </button>
                          ) : null}
                          {comment.ownedByMe ? (
                            <button
                              type="button"
                              onClick={() => void removeComment(comment.id)}
                              disabled={commentBusy}
                              className="text-xs text-zinc-500 hover:text-red-500 disabled:opacity-60"
                            >
                              {t("home.comment.delete")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!commentsLoading && commentsTotal > comments.length ? (
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
            ) : null}

            {replyParentId != null && replyToUsername ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs dark:border-violet-900/40 dark:bg-violet-950/40">
                <span className="font-medium text-violet-900 dark:text-violet-200">
                  {t("home.comment.replyingTo", { username: replyToUsername })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyParentId(null);
                    setReplyToUsername(null);
                  }}
                  className="shrink-0 font-semibold text-violet-700 underline dark:text-violet-400"
                >
                  {t("home.comment.cancelReply")}
                </button>
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              <textarea
                ref={commentInputRef}
                value={commentMessage}
                disabled={!cardActive}
                onChange={(e) => setCommentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  void submitComment();
                }}
                placeholder={
                  replyParentId != null
                    ? t("home.thread.replyPlaceholder")
                    : t("home.thread.commentPlaceholder")
                }
                maxLength={500}
                rows={2}
                className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-zinc-400">{t("home.thread.commentHint")}</p>
                <button
                  type="button"
                  onClick={() => void submitComment()}
                  disabled={!cardActive || commentBusy || !commentMessage.trim()}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {replyParentId != null
                    ? t("home.thread.postReply")
                    : t("home.comment.post")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <EditThreadDialog
        thread={thread}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={onUpdateThread}
      />
    </>
  );
});
