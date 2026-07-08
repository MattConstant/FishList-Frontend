"use client";

import { FormEvent, useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { useLocale } from "@/contexts/locale-context";
import {
  createForumThread,
  getDisplayErrorMessage,
  type ForumThreadPost,
  type PostVisibility,
} from "@/lib/api";

type CreateThreadDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (thread: ForumThreadPost) => void;
};

export function CreateThreadDialog({
  open,
  onClose,
  onCreated,
}: CreateThreadDialogProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  const visibilityOptions: { value: PostVisibility; label: string }[] = [
    { value: "PUBLIC", label: t("catch.visibility.public") },
    { value: "FRIENDS", label: t("catch.visibility.friends") },
    { value: "PRIVATE", label: t("catch.visibility.private") },
  ];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;

    setPending(true);
    setError("");
    try {
      const created = await createForumThread({
        title: trimmedTitle,
        body: trimmedBody,
        visibility,
      });
      setTitle("");
      setBody("");
      setVisibility("PUBLIC");
      onCreated(created);
      onClose();
    } catch (err) {
      setError(getDisplayErrorMessage(err, t("home.createThread.error")));
    } finally {
      setPending(false);
    }
  }

  return (
    <ModalShell open={open} labelledBy="create-thread-title">
      <div className="max-h-[min(90dvh,90vh)] w-full max-w-lg touch-auto overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="create-thread-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {t("home.createThread.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t("home.createThread.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={t("home.createThread.cancel")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("home.createThread.titleLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder={t("home.createThread.titlePlaceholder")}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("home.createThread.bodyLabel")}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${inputClass} min-h-[140px] resize-y`}
              placeholder={t("home.createThread.bodyPlaceholder")}
              maxLength={5000}
              required
            />
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("home.createThread.visibilityLabel")}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={[
                    "cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition",
                    visibility === opt.value
                      ? "border-sky-500 bg-sky-50 text-sky-800 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-200"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="thread-visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t("home.createThread.cancel")}
            </button>
            <button
              type="submit"
              disabled={pending || !title.trim() || !body.trim()}
              className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {pending ? t("home.createThread.posting") : t("home.createThread.submit")}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
