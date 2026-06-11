"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/locale-context";

type PostChooserDialogProps = {
  open: boolean;
  onClose: () => void;
  onStartDiscussion: () => void;
};

export function PostChooserDialog({
  open,
  onClose,
  onStartDiscussion,
}: PostChooserDialogProps) {
  const { t } = useLocale();
  const router = useRouter();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-chooser-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="post-chooser-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {t("home.postChooser.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t("home.postChooser.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={t("home.postChooser.cancel")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/map");
            }}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-sky-700 dark:hover:bg-sky-950/30"
          >
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {t("home.postChooser.catchTitle")}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t("home.postChooser.catchDesc")}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onStartDiscussion();
            }}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-sky-700 dark:hover:bg-sky-950/30"
          >
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {t("home.postChooser.threadTitle")}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t("home.postChooser.threadDesc")}
            </p>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t("home.postChooser.cancel")}
        </button>
      </div>
    </div>
  );
}
