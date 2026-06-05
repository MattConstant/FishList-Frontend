"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  FISHING_TYPE_OPTIONS,
  getDisplayErrorMessage,
  updateCatchPost,
  type FeedPost,
  type FishEntryPayload,
  type FishingType,
  type PostVisibility,
} from "@/lib/api";
import { cmToInches, inchesToCm, kgToLbs, lbsToKg } from "@/lib/units";

type FishRow = {
  id: string;
  species: string;
  lengthIn: string;
  weightLbs: string;
  notes: string;
};

const VISIBILITY_OPTIONS: {
  value: PostVisibility;
  labelKey: "catch.visibility.public" | "catch.visibility.friends" | "catch.visibility.private";
  hintKey:
    | "catch.visibility.publicHint"
    | "catch.visibility.friendsHint"
    | "catch.visibility.privateHint";
}[] = [
  {
    value: "PUBLIC",
    labelKey: "catch.visibility.public",
    hintKey: "catch.visibility.publicHint",
  },
  {
    value: "FRIENDS",
    labelKey: "catch.visibility.friends",
    hintKey: "catch.visibility.friendsHint",
  },
  {
    value: "PRIVATE",
    labelKey: "catch.visibility.private",
    hintKey: "catch.visibility.privateHint",
  },
];

function createFishRow(partial?: Partial<FishRow>): FishRow {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fish-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    species: "",
    lengthIn: "",
    weightLbs: "",
    notes: "",
    ...partial,
  };
}

function fishRowsFromPost(post: FeedPost): FishRow[] {
  const details = post.catch.fishDetails;
  if (details && details.length > 0) {
    return details.map((f) =>
      createFishRow({
        species: f.species ?? "",
        lengthIn:
          f.lengthCm != null && f.lengthCm > 0
            ? String(Math.round(cmToInches(f.lengthCm) * 10) / 10)
            : "",
        weightLbs:
          f.weightKg != null && f.weightKg > 0
            ? String(Math.round(kgToLbs(f.weightKg) * 10) / 10)
            : "",
        notes: f.notes ?? "",
      }),
    );
  }
  return [
    createFishRow({
      species: post.catch.species ?? "",
      lengthIn:
        post.catch.lengthCm != null && post.catch.lengthCm > 0
          ? String(Math.round(cmToInches(post.catch.lengthCm) * 10) / 10)
          : "",
      weightLbs:
        post.catch.weightKg != null && post.catch.weightKg > 0
          ? String(Math.round(kgToLbs(post.catch.weightKg) * 10) / 10)
          : "",
      notes: post.catch.notes ?? "",
    }),
  ];
}

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

type EditPostDialogProps = {
  post: FeedPost;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: FeedPost) => void;
};

export function EditPostDialog({ post, open, onClose, onSaved }: EditPostDialogProps) {
  const { t } = useLocale();
  const [locationName, setLocationName] = useState(post.locationName);
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility ?? "PUBLIC");
  const [fishingType, setFishingType] = useState<FishingType | "">(post.catch.fishingType ?? "");
  const [description, setDescription] = useState(post.catch.description ?? "");
  const [fishRows, setFishRows] = useState<FishRow[]>(() => fishRowsFromPost(post));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLocationName(post.locationName);
    setVisibility(post.visibility ?? "PUBLIC");
    setFishingType(post.catch.fishingType ?? "");
    setDescription(post.catch.description ?? "");
    setFishRows(fishRowsFromPost(post));
    setError("");
  }, [open, post]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const name = locationName.trim();
    if (!name) {
      setError(t("home.editPost.locationRequired"));
      return;
    }

    const normalizedRows = fishRows.map((row) => ({
      ...row,
      species: row.species.trim(),
    }));
    for (const row of normalizedRows) {
      if (!row.species) {
        setError(t("home.editPost.speciesRequired"));
        return;
      }
    }

    const fish: FishEntryPayload[] = normalizedRows.map((row) => {
      const line: FishEntryPayload = { species: row.species };
      const lIn = parseFloat(row.lengthIn);
      if (!isNaN(lIn) && lIn > 0) line.lengthCm = inchesToCm(lIn);
      const wLbs = parseFloat(row.weightLbs);
      if (!isNaN(wLbs) && wLbs > 0) line.weightKg = lbsToKg(wLbs);
      if (row.notes.trim()) line.notes = row.notes.trim();
      return line;
    });

    setPending(true);
    try {
      const res = await updateCatchPost(post.locationId, post.catch.id, {
        locationName: name,
        visibility,
        fishingType: fishingType || null,
        description: description.trim() || null,
        fish,
      });
      onSaved({
        ...post,
        locationName: res.locationName,
        visibility: res.visibility,
        catch: {
          ...post.catch,
          ...res.catch,
          imageUrls:
            res.catch.imageUrls ??
            (res.catch.imageUrl ? [res.catch.imageUrl] : post.catch.imageUrls),
        },
      });
      onClose();
    } catch (err) {
      setError(getDisplayErrorMessage(err, t("home.editPost.error")));
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-post-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="edit-post-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {t("home.editPost.title")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t("home.editPost.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={t("home.editPost.cancel")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("home.editPost.locationName")}
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className={inputClass}
              maxLength={120}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("catch.visibility.label")}
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300"
                  title={t(opt.hintKey)}
                >
                  <input
                    type="radio"
                    name="edit-post-visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                  {t(opt.labelKey)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-post-fishing-type"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t("catch.fishingType.label")}
            </label>
            <select
              id="edit-post-fishing-type"
              value={fishingType}
              onChange={(e) => setFishingType(e.target.value as FishingType | "")}
              className={inputClass}
            >
              <option value="">{t("catch.fishingType.placeholder")}</option>
              {FISHING_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`catch.fishingType.${opt.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("home.editPost.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[4.5rem] resize-y`}
              maxLength={2048}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t("catch.fish.section")}
              </span>
              <button
                type="button"
                onClick={() => setFishRows((prev) => [...prev, createFishRow()])}
                className="rounded-lg border border-sky-600 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-100 dark:hover:bg-sky-900/50"
              >
                {t("catch.fish.add")}
              </button>
            </div>

            {fishRows.map((row, index) => (
              <div
                key={row.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-600 dark:bg-zinc-800/50"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                    {t("catch.fish.heading").replace("{n}", String(index + 1))}
                  </span>
                  {fishRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setFishRows((prev) => prev.filter((r) => r.id !== row.id))}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      {t("catch.fish.remove")}
                    </button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={row.species}
                    onChange={(e) =>
                      setFishRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, species: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder={t("catch.fish.species")}
                    className={inputClass}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.lengthIn}
                      onChange={(e) =>
                        setFishRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, lengthIn: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder={t("catch.fish.lengthIn")}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.weightLbs}
                      onChange={(e) =>
                        setFishRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, weightLbs: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder={t("catch.fish.weightLbs")}
                      className={inputClass}
                    />
                  </div>
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) =>
                      setFishRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, notes: e.target.value } : r,
                        ),
                      )
                    }
                    placeholder={t("catch.fish.notes")}
                    className={inputClass}
                    maxLength={500}
                  />
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t("home.editPost.cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {pending ? t("home.editPost.saving") : t("home.editPost.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
