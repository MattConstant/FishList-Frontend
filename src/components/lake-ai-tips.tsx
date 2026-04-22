"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fetchLakeFishingInsights,
  getDisplayErrorMessage,
} from "@/lib/api";
import { useLocale } from "@/contexts/locale-context";
import { waterbodyToInsightPayload } from "@/lib/lake-insights";
import type { WaterbodyGroup } from "@/lib/geohub";

type Props = {
  group: WaterbodyGroup;
  canUseAi: boolean;
};

export function LakeAiTipsSection({ group, canUseAi }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onClick() {
    setError("");
    if (!canUseAi) return;
    setLoading(true);
    setText(null);
    try {
      const { text: insight } = await fetchLakeFishingInsights(
        waterbodyToInsightPayload(group),
      );
      setText(insight);
    } catch (e) {
      setError(getDisplayErrorMessage(e, "Could not load tips."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <span
          className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(34,197,94,0.25)]"
          aria-hidden
        />
        {t("forecast.mapAiStockedLabel")}
      </div>
      {!canUseAi ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/login"
            className="font-semibold text-sky-600 underline dark:text-sky-400"
          >
            {t("forecast.mapAiSignIn")}
          </Link>{" "}
          {t("forecast.mapAiSignInSuffix")}
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void onClick()}
            disabled={loading}
            className="inline-flex max-w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950/80 dark:text-violet-100 dark:hover:bg-violet-900/80"
          >
            <span aria-hidden>✨</span>
            {t("forecast.mapAiTipsButton")}
          </button>
          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {t("forecast.loading")}
            </p>
          ) : null}
          {text ? (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">
              <p className="whitespace-pre-wrap">{text}</p>
              <p className="mt-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                {t("forecast.mapAiDisclaimer")}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
