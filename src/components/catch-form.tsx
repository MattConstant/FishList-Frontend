"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  ApiHttpError,
  createLocationAndCatch,
  FISHING_TYPE_OPTIONS,
  getDisplayErrorMessage,
  identifyFishFromImage,
  MAX_IMAGE_UPLOAD_BYTES,
  uploadImage,
  validateImageFileForUpload,
  WATER_TYPE_OPTIONS,
  type AddCatchPayload,
  type FishEntryPayload,
  type FishingType,
  type PostVisibility,
  type WaterType,
} from "@/lib/api";
import { inchesToCm, lbsToKg } from "@/lib/units";

type FishRow = {
  id: string;
  species: string;
  /** Raw imperial input from the user; converted to cm before submission. */
  lengthIn: string;
  /** Raw imperial input from the user; converted to kg before submission. */
  weightLbs: string;
  notes: string;
};

function createEmptyFishRow(): FishRow {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fish-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    species: "",
    lengthIn: "",
    weightLbs: "",
    notes: "",
  };
}

export type CatchFormSuccessInfo = {
  locationName: string;
  lat: number;
  lng: number;
  /** Summary line (comma-separated species) */
  species: string;
  imageUrl?: string;
  imageUrls?: string[];
  fishDetails: FishEntryPayload[];
};

type CatchFormProps = {
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess: (info: CatchFormSuccessInfo) => void;
};

const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.heic";
const MAX_FILES = 4;

const VISIBILITY_OPTIONS: {
  value: PostVisibility;
  labelKey: string;
  hintKey: string;
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

export default function CatchForm({ lat, lng, onClose, onSuccess }: CatchFormProps) {
  const { t } = useLocale();
  const [locationName, setLocationName] = useState("");
  const [fishRows, setFishRows] = useState<FishRow[]>(() => [createEmptyFishRow()]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  /** When every selected photo fails to upload — full detail; blocks save and keeps modal open. */
  const [photoUploadDetails, setPhotoUploadDetails] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [fishingType, setFishingType] = useState<FishingType | "">("");
  const [waterType, setWaterType] = useState<WaterType | "">("");
  const fileRef = useRef<HTMLInputElement>(null);
  const photoUploadErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (photoUploadDetails) {
      photoUploadErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [photoUploadDetails]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const allIncoming = Array.from(e.target.files ?? []);
    const incoming = allIncoming.slice(0, MAX_FILES);
    const ignoredByCount = allIncoming.length - incoming.length;
    const valid: File[] = [];
    let rejected = 0;
    for (const file of incoming) {
      try {
        validateImageFileForUpload(file);
        valid.push(file);
      } catch {
        rejected += 1;
      }
    }
    if (previews.length) {
      previews.forEach((url) => URL.revokeObjectURL(url));
    }
    setSelectedFiles(valid);
    setPreviews(valid.map((f) => URL.createObjectURL(f)));
    setPhotoUploadDetails(null);
    if (rejected > 0 || ignoredByCount > 0) {
      const maxMb = Math.floor(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));
      setUploadWarning(
        `Some files were skipped. Allowed: JPG, PNG, GIF, WEBP, HEIC — up to ${maxMb} MB each, max ${MAX_FILES} photos.`,
      );
    } else {
      setUploadWarning("");
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const next = [...prev];
      const removed = next[index];
      if (removed) URL.revokeObjectURL(removed);
      next.splice(index, 1);
      return next;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setUploadWarning("");
    setPhotoUploadDetails(null);

    const name = locationName.trim();
    if (!name) {
      setError("Location name is required.");
      return;
    }

    const normalizedRows = fishRows.map((row) => ({
      ...row,
      species: row.species.trim(),
    }));
    for (const row of normalizedRows) {
      if (!row.species) {
        setError("Each fish must have a species.");
        return;
      }
    }

    setPending(true);
    try {
      const imageUrls: string[] = [];

      if (selectedFiles.length > 0) {
        setStatus("Uploading photos…");
        const uploadFailures: string[] = [];
        for (let i = 0; i < selectedFiles.slice(0, MAX_FILES).length; i++) {
          const file = selectedFiles[i];
          const label = file.name?.trim() || `Photo ${i + 1}`;
          try {
            const uploadRes = await uploadImage(file);
            imageUrls.push(uploadRes.objectKey);
          } catch (err) {
            if (err instanceof ApiHttpError && err.status === 429) {
              window.alert(t("errors.uploadLimitReached"));
              return;
            }
            const detail =
              err instanceof ApiHttpError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : "Upload failed";
            uploadFailures.push(`${label}: ${detail}`);
          }
        }
        if (uploadFailures.length > 0 && imageUrls.length > 0) {
          setUploadWarning(
            `${uploadFailures.length} of ${selectedFiles.length} photo(s) could not be uploaded. Your catch will still be saved with the photos that succeeded.\n\n${uploadFailures.join("\n")}`,
          );
        }

        if (selectedFiles.length > 0 && imageUrls.length === 0) {
          const detail =
            uploadFailures.length > 0
              ? uploadFailures.join("\n")
              : "No response from the upload service. Open DevTools → Network and check POST /api/storage/images.";
          setPhotoUploadDetails(detail);
          return;
        }
      }

      setStatus("Saving catch…");

      const fish: FishEntryPayload[] = normalizedRows.map((row) => {
        const line: FishEntryPayload = { species: row.species };
        const lIn = parseFloat(row.lengthIn);
        if (!isNaN(lIn) && lIn > 0) line.lengthCm = inchesToCm(lIn);
        const wLbs = parseFloat(row.weightLbs);
        if (!isNaN(wLbs) && wLbs > 0) line.weightKg = lbsToKg(wLbs);
        if (row.notes.trim()) line.notes = row.notes.trim();
        return line;
      });

      const catchData: AddCatchPayload = { fish };
      if (imageUrls.length > 0) {
        catchData.imageUrl = imageUrls[0];
        catchData.imageUrls = imageUrls;
      }
      if (fishingType) {
        catchData.fishingType = fishingType;
      }

      await createLocationAndCatch(
        {
          locationName: name,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          timeStamp: new Date().toISOString(),
          visibility,
          ...(waterType ? { waterType } : {}),
        },
        catchData,
      );

      onSuccess({
        locationName: name,
        species: fish.map((f) => f.species).join(", "),
        lat,
        lng,
        imageUrl: imageUrls[0],
        imageUrls,
        fishDetails: fish,
      });
    } catch (err) {
      setError(getDisplayErrorMessage(err, t("errors.saveCatchFailed")));
    } finally {
      setPending(false);
      setStatus("");
    }
  }

  async function onIdentifyFish() {
    if (identifying || pending) return;
    if (selectedFiles.length === 0) {
      setError("Please select at least one photo first.");
      return;
    }
    setError("");
    setIdentifying(true);
    try {
      const result = await identifyFishFromImage(selectedFiles[0]);
      if (result.suggestedSpecies && result.suggestedSpecies !== "Unknown") {
        setFishRows((prev) => {
          const next = [...prev];
          const head = next[0];
          if (head) next[0] = { ...head, species: result.suggestedSpecies ?? "" };
          return next;
        });
      } else {
        setUploadWarning(t("errors.aiIdentifyInconclusive"));
      }
    } catch (err) {
      setError(getDisplayErrorMessage(err, t("errors.aiIdentifyFailed")));
    } finally {
      setIdentifying(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-h-[min(90dvh,90vh)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Register a Catch
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Location name *
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Lake Simcoe — south shore"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("catch.visibility.label")}
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300"
                  title={t(opt.hintKey)}
                >
                  <input
                    type="radio"
                    name="catch-visibility"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="catch-fishing-type"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                {t("catch.fishingType.label")}
              </label>
              <select
                id="catch-fishing-type"
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
              <label
                htmlFor="catch-water-type"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                {t("catch.waterType.label")}
              </label>
              <select
                id="catch-water-type"
                value={waterType}
                onChange={(e) => setWaterType(e.target.value as WaterType | "")}
                className={inputClass}
              >
                <option value="">{t("catch.waterType.placeholder")}</option>
                {WATER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`catch.waterType.${opt.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {t("catch.fish.section")}
              </span>
              <button
                type="button"
                onClick={() => setFishRows((prev) => [...prev, createEmptyFishRow()])}
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
                  {fishRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFishRows((prev) =>
                          prev.length <= 1 ? prev : prev.filter((r) => r.id !== row.id),
                        )
                      }
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      {t("catch.fish.remove")}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("catch.fish.species")} *
                    </label>
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
                      className={inputClass}
                      placeholder="e.g. Brook Trout"
                      required
                      aria-required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("catch.fish.lengthIn")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.lengthIn}
                      onChange={(e) =>
                        setFishRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, lengthIn: e.target.value } : r,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("catch.fish.weightLbs")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.weightLbs}
                      onChange={(e) =>
                        setFishRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, weightLbs: e.target.value } : r,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("catch.fish.notes")}
                    </label>
                    <textarea
                      value={row.notes}
                      onChange={(e) =>
                        setFishRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, notes: e.target.value } : r,
                          ),
                        )
                      }
                      rows={2}
                      className={inputClass}
                      placeholder="Weather, bait, technique…"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Photos (up to 4)
            </label>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Since this is a new app and my budget is not amazing, we are limiting image uploads to 15 per user per day.
              If you wish to support this app, feel free to donate.
            </p>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Tip: photos around 10 MB or smaller usually upload most reliably; very large camera files can time out.
            </p>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void onIdentifyFish()}
                disabled={identifying || pending || selectedFiles.length === 0}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {identifying ? "Identifying fish..." : "Identify fish with AI"}
              </button>
            </div>
            {previews.length > 0 ? (
              <div className="mt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {previews.map((src, i) => (
                    <div key={src} className="relative">
                      <Image
                        src={src}
                        alt={`Preview ${i + 1}`}
                        width={320}
                        height={112}
                        className="h-28 w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                        aria-label="Remove photo"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Replace photos
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ACCEPTED}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="mt-1 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-4 transition hover:border-sky-400 dark:border-zinc-600 dark:hover:border-sky-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-zinc-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <span className="text-xs text-zinc-500">
                  Click to add a photo
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          {photoUploadDetails && (
            <div
              ref={photoUploadErrorRef}
              role="alert"
              className="max-h-[min(50vh,16rem)] overflow-y-auto rounded-xl border border-red-400/90 bg-red-50 p-4 text-red-950 shadow-sm dark:border-red-500/80 dark:bg-red-950/50 dark:text-red-50"
            >
              <p className="text-sm font-semibold">We couldn’t attach your photos</p>
              <p className="mt-1 text-xs leading-relaxed opacity-95">
                Your catch hasn’t been saved yet, so you can swap in different photos or tap Save again.
                Very large files (often about 10 MB and up) are more likely to fail on a slow
                connection — exporting or resizing the image first usually helps. Details are below.
              </p>
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-white/80 px-3 py-2 font-sans text-xs leading-relaxed text-red-900 dark:bg-black/30 dark:text-red-100">
                {photoUploadDetails}
              </pre>
            </div>
          )}

          {uploadWarning && (
            <p
              className="whitespace-pre-wrap break-words text-sm text-amber-800 dark:text-amber-300"
              role="status"
            >
              {uploadWarning}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            >
              {pending ? status || "Saving…" : "Save catch"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
