"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  ApiHttpError,
  createLocationAndCatch,
  getDisplayErrorMessage,
  identifyFishFromImage,
  uploadImage,
  validateImageFileForUpload,
  type AddCatchPayload,
} from "@/lib/api";

type CatchFormProps = {
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess: (info: {
    locationName: string;
    species: string;
    lat: number;
    lng: number;
    imageUrl?: string;
    imageUrls?: string[];
  }) => void;
};

const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.heic";
const MAX_FILES = 4;

export default function CatchForm({ lat, lng, onClose, onSuccess }: CatchFormProps) {
  const { t } = useLocale();
  const [locationName, setLocationName] = useState("");
  const [species, setSpecies] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (rejected > 0 || ignoredByCount > 0) {
      setUploadWarning(
        "Only JPG, JPEG, PNG, GIF, WEBP, and HEIC files are allowed (max 4 photos).",
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

    const name = locationName.trim();
    const sp = species.trim();
    if (!name) {
      setError("Location name is required.");
      return;
    }
    if (!sp) {
      setError("Species is required.");
      return;
    }

    setPending(true);
    try {
      const imageUrls: string[] = [];

      if (selectedFiles.length > 0) {
        setStatus("Uploading photos…");
        for (const file of selectedFiles.slice(0, MAX_FILES)) {
          try {
            const uploadRes = await uploadImage(file);
            imageUrls.push(uploadRes.objectKey);
          } catch (err) {
            if (err instanceof ApiHttpError && err.status === 429) {
              window.alert(t("errors.uploadLimitReached"));
              return;
            }
            setUploadWarning(
              "One or more photos could not be uploaded. Your catch will still be saved with successful uploads.",
            );
          }
        }
      }

      setStatus("Saving catch…");
      const catchData: AddCatchPayload = { species: sp };
      const q = parseInt(quantity, 10);
      if (!isNaN(q) && q >= 1) catchData.quantity = q;
      const l = parseFloat(lengthCm);
      if (!isNaN(l) && l > 0) catchData.lengthCm = l;
      const w = parseFloat(weightKg);
      if (!isNaN(w) && w > 0) catchData.weightKg = w;
      if (notes.trim()) catchData.notes = notes.trim();
      if (imageUrls.length > 0) {
        catchData.imageUrl = imageUrls[0];
        catchData.imageUrls = imageUrls;
      }

      await createLocationAndCatch(
        {
          locationName: name,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          timeStamp: new Date().toISOString(),
        },
        catchData,
      );
      onSuccess({
        locationName: name,
        species: sp,
        lat,
        lng,
        imageUrl: imageUrls[0],
        imageUrls,
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
        setSpecies(result.suggestedSpecies);
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
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Species *
              </label>
              <input
                type="text"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className={inputClass}
                placeholder="e.g. Brook Trout"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Length (cm)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Weight (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Weather, bait, technique…"
            />
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
          {uploadWarning && (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
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
