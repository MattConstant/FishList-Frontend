/**
 * FishList Spring API — Bearer JWT after Google Sign-In (see POST /api/auth/google).
 */

import type { LakeFishingInsightPayload } from "@/lib/lake-insights";

const SESSION_KEY = "fishlist-session";

/**
 * Fallback if NEXT_PUBLIC_API_BASE_URL is missing (e.g. old build).
 * Normal flow: .env.development / .env.production / Vercel env set this at build time.
 */
const DEFAULT_PRODUCTION_API_BASE = "https://fishlist-backend.onrender.com";

export class ApiHttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    options?: { code?: string; fieldErrors?: Record<string, string> },
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.code = options?.code;
    this.fieldErrors = options?.fieldErrors;
  }
}

type ApiErrorPayload = {
  status?: number;
  code?: string;
  message?: string;
  errors?: Record<string, string>;
};

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Must stay in sync with Spring `MULTIPART_MAX_SIZE` (default 25MB in application.properties).
 * Reject before upload so users get a clear message instead of a 502 from the gateway.
 */
export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Filename part for multipart uploads — some browsers send an empty name; the API needs an extension. */
export function imageUploadFileName(file: File): string {
  const trimmed = file.name?.trim();
  if (trimmed && getFileExtension(trimmed)) {
    return trimmed;
  }
  const ext = inferExtensionFromMime(file.type) || ".jpg";
  return `image${ext}`;
}

function inferExtensionFromMime(mimeRaw: string): string {
  const mime = mimeRaw.split(";")[0]?.trim().toLowerCase() ?? "";
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heic",
  };
  return map[mime] ?? "";
}

export type AccountResponse = {
  id: number;
  username: string;
  /** S3/MinIO object key; resolve with {@link getImageUrl} when present. */
  profileImageKey?: string | null;
};

export type AccountUpdateResponse = {
  account: AccountResponse;
  accessToken: string;
  tokenType: string;
};

export type AdminMeResponse = {
  username: string;
  admin: boolean;
};

export type AdminSummaryResponse = {
  totalAccounts: number;
  totalLocations: number;
  totalCatches: number;
  totalComments: number;
  totalLikes: number;
  totalFriendships: number;
};

export type AdminAccountRowResponse = {
  id: number;
  username: string;
  locations: number;
  catches: number;
  comments: number;
  likes: number;
};

export type StoredSession = {
  username: string;
  authorizationHeader: string;
};

export function getDisplayErrorMessage(
  err: unknown,
  fallback = "Something went wrong.",
): string {
  if (err instanceof ApiHttpError) {
    if (err.code === "VALIDATION_ERROR") return "Please check your input and try again.";
    if (err.status === 401) return "Session expired or invalid. Please sign in again.";
    if (err.status === 503) return "Sign-in is not configured on the server.";
    if (err.status === 403)
      return "Access denied. New site URL? Add that origin to the API CORS list (app.cors.*), not only Google OAuth.";
    if (err.status === 404) return "The requested item was not found.";
    if (err.status === 409) return "That value is already in use.";
    if (err.status === 429) return "Too many requests. Please try again later.";
    if (err.status === 502)
      return "Upload failed (bad gateway). Try a smaller photo, or ask the host to raise MULTIPART_MAX_SIZE / proxy body limits.";
    if (err.status >= 500) return "Server error. Please try again.";
    return fallback;
  }
  return fallback;
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return DEFAULT_PRODUCTION_API_BASE;
  return "http://localhost:8080";
}

export function validateImageFileForUpload(file: File): void {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    const mb = Math.floor(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));
    throw new Error(
      `Each photo must be at most ${mb} MB. Pick a smaller file or reduce export/camera quality.`,
    );
  }
  let ext = getFileExtension(file.name);
  if (!ext) {
    ext = inferExtensionFromMime(file.type);
  }
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error("Unsupported file extension. Allowed: jpg, jpeg, png, gif, webp, heic.");
  }
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime && !ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    throw new Error("Unsupported file type. Allowed image formats: JPEG, PNG, GIF, WEBP, HEIC.");
  }
}

export type GoogleAuthResponse = {
  accessToken: string;
  tokenType: string;
  account: AccountResponse;
};

/** Exchanges a Google ID token (GIS credential) for a FishList JWT. */
export async function exchangeGoogleCredential(
  credential: string,
): Promise<GoogleAuthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<GoogleAuthResponse>;
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (
      typeof parsed?.username === "string" &&
      typeof parsed?.authorizationHeader === "string"
    ) {
      return parsed;
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  return null;
}

export function saveSession(session: StoredSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function fetchCurrentAccount(
  authorizationHeader: string,
): Promise<AccountResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/accounts/me`, {
    headers: { Authorization: authorizationHeader },
  });
  await throwIfNotOk(res);
  return res.json() as Promise<AccountResponse>;
}

/**
 * GET JSON with optional Bearer when a session exists. Use for endpoints that may be
 * public or accept optional auth (e.g. viewing another account's profile or locations).
 */
export async function apiGet(path: string): Promise<Response> {
  const base = getApiBaseUrl();
  const url =
    path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const session = typeof window !== "undefined" ? loadSession() : null;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (session?.authorizationHeader) {
    headers.Authorization = session.authorizationHeader;
  }
  return fetch(url, { headers, cache: "no-store" });
}

async function apiGetJson<T>(path: string): Promise<T> {
  const res = await apiGet(path);
  await throwIfNotOk(res);
  return res.json() as Promise<T>;
}

/** Updates username and/or profile image (object key from {@link uploadImage}; empty string clears photo). Returns a new JWT. */
export async function patchMyProfile(payload: {
  username?: string;
  profileImageKey?: string;
}): Promise<AccountUpdateResponse> {
  return authJson<AccountUpdateResponse>("/api/accounts/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Public account lookup by id. Uses Bearer token when logged in; works without a session
 * if the API allows anonymous GET (otherwise returns 401).
 */
export async function fetchAccountById(id: number): Promise<AccountResponse> {
  return apiGetJson<AccountResponse>(`/api/accounts/${id}`);
}

export async function searchAccounts(query: string): Promise<AccountResponse[]> {
  return authJson<AccountResponse[]>(
    `/api/accounts/search?query=${encodeURIComponent(query)}`,
  );
}

export async function fetchMyFriends(): Promise<AccountResponse[]> {
  return authJson<AccountResponse[]>("/api/accounts/me/friends");
}

export async function addFriend(accountId: number): Promise<AccountResponse> {
  return authJson<AccountResponse>(`/api/accounts/${accountId}/friends`, {
    method: "POST",
  });
}

export async function removeFriend(accountId: number): Promise<void> {
  await authVoid(`/api/accounts/${accountId}/friends`, {
    method: "DELETE",
  });
}

export async function fetchAdminMe(): Promise<AdminMeResponse> {
  return authJson<AdminMeResponse>("/api/admin/me");
}

export async function fetchAdminSummary(): Promise<AdminSummaryResponse> {
  return authJson<AdminSummaryResponse>("/api/admin/summary");
}

export async function fetchAdminAccounts(
  query = "",
  limit = 50,
): Promise<AdminAccountRowResponse[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
  });
  return authJson<AdminAccountRowResponse[]>(
    `/api/admin/accounts?${params.toString()}`,
  );
}

export async function adminDeleteAccount(accountId: number): Promise<void> {
  await authVoid(`/api/admin/accounts/${accountId}`, {
    method: "DELETE",
  });
}

/**
 * Calls the API with the stored Bearer token. Clears session on 401.
 */
export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = loadSession();
  if (!session) {
    redirectToLogin();
    throw new Error("Not authenticated");
  }

  const base = getApiBaseUrl();
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...init,
    cache: init.cache ?? "no-store",
    headers: {
      ...normalizeHeaders(init.headers),
      Authorization: session.authorizationHeader,
    },
  });

  if (res.status === 401) {
    clearSession();
    redirectToLogin();
  }
  return res;
}

async function authJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, init);
  await throwIfNotOk(res);
  return res.json() as Promise<T>;
}

async function authVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await authenticatedFetch(path, init);
  await throwIfNotOk(res);
}

// ── Location + Catch types ──────────────────────────────────────────

/** Matches server `PostVisibility` (who can see the location / feed post). */
export type PostVisibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

export type LocationPayload = {
  locationName: string;
  latitude: string;
  longitude: string;
  timeStamp: string;
  Details?: string;
  visibility?: PostVisibility;
};

export type LocationResponse = LocationPayload & {
  id: number;
  accountId: number;
};

/** One fish line in a catch (matches server `FishEntryRequest` / `fishDetails` JSON). */
export type FishEntryPayload = {
  species: string;
  lengthCm?: number;
  weightKg?: number;
  notes?: string;
};

/** Payload for POST /locations/{id}/catches — use `fish` for multiple fish in one post. */
export type AddCatchPayload = {
  species?: string;
  quantity?: number;
  /** When set (and non-empty), all fish are stored on one catch as `fishDetails` on the server. */
  fish?: FishEntryPayload[];
  lengthCm?: number;
  weightKg?: number;
  notes?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
};

export type CatchResponse = {
  id: number;
  locationId: number;
  species: string;
  quantity?: number;
  lengthCm?: number;
  weightKg?: number;
  notes?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  fishDetails?: FishEntryPayload[] | null;
};

export async function createLocation(
  loc: LocationPayload,
): Promise<string> {
  const res = await authenticatedFetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loc),
  });
  await throwIfNotOk(res);
  return res.text();
}

/** Adds one catch to an existing location (same trip / coordinates). */
export async function addCatchToLocation(
  locationId: string,
  catchData: AddCatchPayload,
): Promise<CatchResponse> {
  const catchRes = await authenticatedFetch(`/api/locations/${locationId}/catches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catchData),
  });
  await throwIfNotOk(catchRes);
  return catchRes.json() as Promise<CatchResponse>;
}

export async function createLocationAndCatch(
  loc: LocationPayload,
  catchData: AddCatchPayload,
): Promise<CatchResponse> {
  const locRes = await authenticatedFetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loc),
  });
  await throwIfNotOk(locRes);
  const locText = await locRes.text();
  const idMatch = locText.match(/(\d+)/);
  if (!idMatch) throw new Error("Could not parse location id from response");
  const locationId = idMatch[1];

  const catchRes = await authenticatedFetch(`/api/locations/${locationId}/catches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catchData),
  });
  await throwIfNotOk(catchRes);
  return catchRes.json() as Promise<CatchResponse>;
}

export type LocationWithCatches = {
  id: number;
  locationName: string;
  latitude: string;
  longitude: string;
  timeStamp: string;
  details: string | null;
  accountId: number;
  catches: CatchResponse[];
};

export async function fetchUserLocations(
  accountId: number,
): Promise<LocationWithCatches[]> {
  const res = await apiGet(`/api/accounts/${accountId}/locations`);
  await throwIfNotOk(res);
  const locations = (await res.json()) as Array<{
    id: number;
    locationName: string;
    latitude: string;
    longitude: string;
    timeStamp: string;
    details: string | null;
    accountId: number;
  }>;

  const results: LocationWithCatches[] = [];
  for (const loc of locations) {
    const catchRes = await apiGet(`/api/locations/${loc.id}/catches`);
    const catches: CatchResponse[] = catchRes.ok ? await catchRes.json() : [];
    results.push({ ...loc, catches });
  }
  return results;
}

export type FeedPost = {
  id: string;
  locationId: number;
  locationName: string;
  latitude: string;
  longitude: string;
  timeStamp: string;
  accountId: number;
  username: string;
  /** Present when the feed API includes it; avoids extra profile fetches. */
  profileImageKey?: string | null;
  catch: CatchResponse;
};

type FeedPostResponse = {
  locationId: number;
  locationName: string;
  latitude: string;
  longitude: string;
  timeStamp: string;
  accountId: number;
  username: string;
  profileImageKey?: string | null;
  catchId: number;
  species: string;
  quantity?: number;
  lengthCm?: number;
  weightKg?: number;
  notes?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string;
  fishDetailsJson?: string | null;
};

function parseFishDetailsJson(
  raw: string | undefined | null,
): FishEntryPayload[] | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return undefined;
    return v as FishEntryPayload[];
  } catch {
    return undefined;
  }
}

export type CatchLikeResponse = {
  catchId: number;
  likesCount: number;
  likedByMe: boolean;
};

export type CatchCommentResponse = {
  id: number;
  catchId: number;
  accountId: number;
  username: string;
  profileImageKey?: string | null;
  message: string;
  createdAt: string;
  ownedByMe: boolean;
};

export type CatchCommentsPageResponse = {
  comments: CatchCommentResponse[];
  totalCount: number;
  offset: number;
  limit: number;
};

export async function fetchLatestPosts(limit = 20, offset = 0): Promise<FeedPost[]> {
  const MAX_PAGE = 100;
  let remaining = Math.max(0, limit);
  let currentOffset = Math.max(0, offset);
  const allRows: FeedPostResponse[] = [];

  while (remaining > 0) {
    const pageSize = Math.min(MAX_PAGE, remaining);
    const rows = await authJson<FeedPostResponse[]>(
      `/api/locations/feed?offset=${currentOffset}&limit=${pageSize}`,
    );
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    remaining -= rows.length;
    currentOffset += rows.length;
  }

  return allRows.map((row) => ({
    id: `${row.locationId}-${row.catchId}`,
    locationId: row.locationId,
    locationName: row.locationName,
    latitude: row.latitude,
    longitude: row.longitude,
    timeStamp: row.timeStamp,
    accountId: row.accountId,
    username: row.username,
    profileImageKey: row.profileImageKey,
    catch: {
      id: row.catchId,
      locationId: row.locationId,
      species: row.species,
      quantity: row.quantity,
      lengthCm: row.lengthCm,
      weightKg: row.weightKg,
      notes: row.notes,
      description: row.description,
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrls
        ? row.imageUrls
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 4)
        : row.imageUrl
          ? [row.imageUrl]
          : [],
      fishDetails: parseFishDetailsJson(row.fishDetailsJson),
    },
  }));
}

export async function fetchCatchLike(
  locationId: number,
  catchId: number,
): Promise<CatchLikeResponse> {
  return authJson<CatchLikeResponse>(
    `/api/locations/${locationId}/catches/${catchId}/like`,
  );
}

export async function likeCatch(
  locationId: number,
  catchId: number,
): Promise<CatchLikeResponse> {
  return authJson<CatchLikeResponse>(
    `/api/locations/${locationId}/catches/${catchId}/like`,
    { method: "POST" },
  );
}

export async function unlikeCatch(
  locationId: number,
  catchId: number,
): Promise<CatchLikeResponse> {
  return authJson<CatchLikeResponse>(
    `/api/locations/${locationId}/catches/${catchId}/like`,
    { method: "DELETE" },
  );
}

export async function fetchCatchComments(
  locationId: number,
  catchId: number,
  offset = 0,
  limit = 3,
): Promise<CatchCommentsPageResponse> {
  return authJson<CatchCommentsPageResponse>(
    `/api/locations/${locationId}/catches/${catchId}/comments?offset=${offset}&limit=${limit}`,
  );
}

export async function createCatchComment(
  locationId: number,
  catchId: number,
  message: string,
): Promise<CatchCommentResponse> {
  return authJson<CatchCommentResponse>(
    `/api/locations/${locationId}/catches/${catchId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
}

export async function deleteCatchComment(
  locationId: number,
  catchId: number,
  commentId: number,
): Promise<void> {
  await authVoid(
    `/api/locations/${locationId}/catches/${catchId}/comments/${commentId}`,
    { method: "DELETE" },
  );
}

export async function deleteCatch(
  locationId: number,
  catchId: number,
): Promise<void> {
  await authVoid(`/api/locations/${locationId}/catches/${catchId}`, {
    method: "DELETE",
  });
}

// ── Image upload ────────────────────────────────────────────────────

export type ImageUploadResponse = {
  bucket: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  getUrl: string;
};

export type FishIdentificationResponse = {
  suggestedSpecies: string;
  confidence: number | null;
  message: string;
};

export type LakeFishingInsightApiResponse = {
  text: string;
};

/**
 * Lake stocking insights — POST same-origin `/api/ai/lake-fishing-insights` (Next proxy → Spring).
 * Returns narrative text (species, tactics, general tips — no map pins).
 */
export async function fetchLakeFishingInsights(
  payload: LakeFishingInsightPayload,
): Promise<{ text: string }> {
  const session = loadSession();
  if (!session) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    throw new Error("Not authenticated");
  }

  const res = await fetch("/api/ai/lake-fishing-insights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session.authorizationHeader,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  await throwIfNotOk(res);
  const data = (await res.json()) as LakeFishingInsightApiResponse;
  if (typeof data.text !== "string") {
    throw new Error("Invalid response from server");
  }
  return { text: data.text };
}

export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  validateImageFileForUpload(file);
  const formData = new FormData();
  formData.append("file", file, imageUploadFileName(file));
  return authJson<ImageUploadResponse>("/api/storage/images", {
    method: "POST",
    body: formData,
  });
}

export async function identifyFishFromImage(
  file: File,
): Promise<FishIdentificationResponse> {
  validateImageFileForUpload(file);
  const formData = new FormData();
  formData.append("file", file, imageUploadFileName(file));
  return authJson<FishIdentificationResponse>("/api/ai/identify-fish", {
    method: "POST",
    body: formData,
  });
}

type CachedDownloadUrl = { url: string; expiresAt: number };
const downloadUrlCache = new Map<string, CachedDownloadUrl>();
const downloadUrlInflight = new Map<string, Promise<string>>();

/**
 * Resolves a presigned URL for a storage object key. Results are cached in-memory for a
 * fraction of the server-reported TTL to avoid hammering the API when many avatars/images mount.
 */
export async function getImageUrl(objectKey: string): Promise<string> {
  const key = objectKey.trim();
  const now = Date.now();
  const cached = downloadUrlCache.get(key);
  if (cached && cached.expiresAt > now) return cached.url;

  let inflight = downloadUrlInflight.get(key);
  if (!inflight) {
    inflight = (async () => {
      const data = await authJson<{
        url: string;
        expiresInSeconds?: number;
      }>(
        `/api/storage/images/download-url?key=${encodeURIComponent(key)}`,
      );
      const resolvedAt = Date.now();
      const sec = data.expiresInSeconds ?? 3600;
      const ttlMs = Math.min(Math.max(30_000, sec * 1000 * 0.85), 55 * 60 * 1000);
      downloadUrlCache.set(key, {
        url: data.url,
        expiresAt: resolvedAt + ttlMs,
      });
      return data.url;
    })().finally(() => {
      downloadUrlInflight.delete(key);
    });
    downloadUrlInflight.set(key, inflight);
  }
  return inflight;
}

// ── Helpers ─────────────────────────────────────────────────────────

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload = (await res.json()) as ApiErrorPayload;
      throw new ApiHttpError(
        payload.message || res.statusText || `HTTP ${res.status}`,
        res.status,
        { code: payload.code, fieldErrors: payload.errors },
      );
    } catch (err) {
      if (err instanceof ApiHttpError) throw err;
      // Fall through to text parsing for malformed JSON.
    }
  }

  const text = await res.text();
  throw new ApiHttpError(
    text || res.statusText || `HTTP ${res.status}`,
    res.status,
  );
}

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot).toLowerCase();
}

function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h);
  }
  return { ...h };
}
