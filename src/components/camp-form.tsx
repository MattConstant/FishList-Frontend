"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  createCampSpot,
  getDisplayErrorMessage,
  uploadImage,
  validateImageFileForUpload,
  MAX_IMAGE_UPLOAD_BYTES,
  type CampSpotResponse,
  type PostVisibility,
} from "@/lib/api";

export type CampFormSuccessInfo = CampSpotResponse;

export default function CampForm({
  lat,
  lng,
  onClose,
  onSuccess,
}: {
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess: (info: CampFormSuccessInfo) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.heic";
  const MAX_FILES = 4;
  const OPTIMIZE_MIN_BYTES = 2 * 1024 * 1024; // 2 MB
  const OPTIMIZE_MAX_DIM = 1920;
  const OPTIMIZE_JPEG_QUALITY = 0.82;

  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fileBaseName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "image";
    const dot = trimmed.lastIndexOf(".");
    return dot > 0 ? trimmed.slice(0, dot) : trimmed;
  }

  async function optimizeImageForUploadIfNeeded(file: File): Promise<File> {
    if (file.size < OPTIMIZE_MIN_BYTES) return file;
    const type = (file.type ?? "").toLowerCase();
    if (type === "image/gif") return file;
    try {
      const bmp =
        typeof createImageBitmap !== "undefined" ? await createImageBitmap(file) : null;
      if (!bmp || !bmp.width || !bmp.height) return file;
      const scale = Math.min(1, OPTIMIZE_MAX_DIM / Math.max(bmp.width, bmp.height));
      const dstW = Math.max(1, Math.round(bmp.width * scale));
      const dstH = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = dstW;
      canvas.height = dstH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bmp, 0, 0, dstW, dstH);
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
          "image/jpeg",
          OPTIMIZE_JPEG_QUALITY,
        );
      });
      if (blob.size >= file.size) return file;
      return new File([blob], `${fileBaseName(file.name)}.jpg`, { type: "image/jpeg" });
    } catch {
      return file;
    }
  }

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
    previews.forEach((u) => URL.revokeObjectURL(u));
    setSelectedFiles(valid);
    setPreviews(valid.map((f) => URL.createObjectURL(f)));
    if (rejected > 0 || ignoredByCount > 0) {
      const maxMb = Math.floor(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));
      setUploadWarning(
        `Some files were skipped. Allowed: JPG, PNG, GIF, WEBP, HEIC (up to ${maxMb} MB each, max ${MAX_FILES} photos).`,
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
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Camp name is required.");
      return;
    }
    setPending(true);
    try {
      const imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.slice(0, MAX_FILES).length; i++) {
          const originalFile = selectedFiles[i];
          const file = await optimizeImageForUploadIfNeeded(originalFile);
          const uploadRes = await uploadImage(file);
          imageUrls.push(uploadRes.objectKey);
        }
      }
      const saved = await createCampSpot({
        name: trimmed,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        timeStamp: new Date().toISOString(),
        visibility,
        imageUrls,
      });
      onSuccess(saved);
    } catch (e2) {
      setError(getDisplayErrorMessage(e2, "Could not save camp spot."));
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  const visibilityOptions: { value: PostVisibility; label: string; hint: string }[] = [
    { value: "PUBLIC", label: t("catch.visibility.public"), hint: t("catch.visibility.publicHint") },
    { value: "FRIENDS", label: t("catch.visibility.friends"), hint: t("catch.visibility.friendsHint") },
    { value: "PRIVATE", label: t("catch.visibility.private"), hint: t("catch.visibility.privateHint") },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-h-[min(90dvh,90vh)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Log a Camp</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Close"
            disabled={pending}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Camp name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Island site, north bay"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("catch.visibility.label")}
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300"
                  title={opt.hint}
                >
                  <input
                    type="radio"
                    name="camp-visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="h-3.5 w-3.5 shrink-0 border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Photos (up to 4)
            </label>
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
                <span className="text-xs text-zinc-500">Click to add photos</span>
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

          {uploadWarning && (
            <p className="whitespace-pre-wrap break-words text-sm text-amber-800 dark:text-amber-300" role="status">
              {uploadWarning}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save camp"}
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

