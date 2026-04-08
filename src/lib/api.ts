/**
 * FishList Spring API — Bearer JWT after Google Sign-In (see POST /api/auth/google).
 */

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

export type AccountResponse = {
  id: number;
  username: string;
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
    if (err.status === 403) return "You are not allowed to do that.";
    if (err.status === 404) return "The requested item was not found.";
    if (err.status === 409) return "That value is already in use.";
    if (err.status === 429) return "Too many requests. Please try again later.";
    if (err.status >= 500) return "Server error. Please try again.";
    return fallback;
  }
  if (err instanceof Error) return fallback;
  return fallback;
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return DEFAULT_PRODUCTION_API_BASE;
  return "http://localhost:8080";
}

export function validateImageFileForUpload(file: File): void {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error("Unsupported file extension. Allowed: jpg, jpeg, png, gif, webp, heic.");
  }
  const mime = file.type.trim().toLowerCase();
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

export async function fetchAccountById(id: number): Promise<AccountResponse> {
  const res = await authenticatedFetch(`/api/accounts/${id}`);
  await throwIfNotOk(res);
  return res.json() as Promise<AccountResponse>;
}

export async function searchAccounts(query: string): Promise<AccountResponse[]> {
  const res = await authenticatedFetch(
    `/api/accounts/search?query=${encodeURIComponent(query)}`,
  );
  await throwIfNotOk(res);
  return res.json() as Promise<AccountResponse[]>;
}

export async function fetchMyFriends(): Promise<AccountResponse[]> {
  const res = await authenticatedFetch("/api/accounts/me/friends");
  await throwIfNotOk(res);
  return res.json() as Promise<AccountResponse[]>;
}

export async function addFriend(accountId: number): Promise<AccountResponse> {
  const res = await authenticatedFetch(`/api/accounts/${accountId}/friends`, {
    method: "POST",
  });
  await throwIfNotOk(res);
  return res.json() as Promise<AccountResponse>;
}

export async function removeFriend(accountId: number): Promise<void> {
  const res = await authenticatedFetch(`/api/accounts/${accountId}/friends`, {
    method: "DELETE",
  });
  await throwIfNotOk(res);
}

export async function fetchAdminMe(): Promise<AdminMeResponse> {
  const res = await authenticatedFetch("/api/admin/me");
  await throwIfNotOk(res);
  return res.json() as Promise<AdminMeResponse>;
}

export async function fetchAdminSummary(): Promise<AdminSummaryResponse> {
  const res = await authenticatedFetch("/api/admin/summary");
  await throwIfNotOk(res);
  return res.json() as Promise<AdminSummaryResponse>;
}

export async function fetchAdminAccounts(
  query = "",
  limit = 50,
): Promise<AdminAccountRowResponse[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
  });
  const res = await authenticatedFetch(`/api/admin/accounts?${params.toString()}`);
  await throwIfNotOk(res);
  return res.json() as Promise<AdminAccountRowResponse[]>;
}

export async function adminDeleteAccount(accountId: number): Promise<void> {
  const res = await authenticatedFetch(`/api/admin/accounts/${accountId}`, {
    method: "DELETE",
  });
  await throwIfNotOk(res);
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

// ── Location + Catch types ──────────────────────────────────────────

export type LocationPayload = {
  locationName: string;
  latitude: string;
  longitude: string;
  timeStamp: string;
  Details?: string;
};

export type LocationResponse = LocationPayload & {
  id: number;
  accountId: number;
};

export type AddCatchPayload = {
  species: string;
  quantity?: number;
  lengthCm?: number;
  weightKg?: number;
  notes?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
};

export type CatchResponse = AddCatchPayload & {
  id: number;
  locationId: number;
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
  const res = await authenticatedFetch(`/api/accounts/${accountId}/locations`);
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
    const catchRes = await authenticatedFetch(`/api/locations/${loc.id}/catches`);
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
  catchId: number;
  species: string;
  quantity?: number;
  lengthCm?: number;
  weightKg?: number;
  notes?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string;
};

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
    const res = await authenticatedFetch(
      `/api/locations/feed?offset=${currentOffset}&limit=${pageSize}`,
    );
    await throwIfNotOk(res);
    const rows = (await res.json()) as FeedPostResponse[];
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
    },
  }));
}

export async function fetchCatchLike(
  locationId: number,
  catchId: number,
): Promise<CatchLikeResponse> {
  const res = await authenticatedFetch(`/api/locations/${locationId}/catches/${catchId}/like`);
  await throwIfNotOk(res);
  return res.json() as Promise<CatchLikeResponse>;
}

export async function likeCatch(
  locationId: number,
  catchId: number,
): Promise<CatchLikeResponse> {
  const res = await authenticatedFetch(`/api/locations/${locationId}/catches/${catchId}/like`, {
    method: "POST",
  });
  await throwIfNotOk(res);
  return res.json() as Promise<CatchLikeResponse>;
}

export async function unlikeCatch(
  locationId: number,
  catchId: number,
): Promise<CatchLikeResponse> {
  const res = await authenticatedFetch(`/api/locations/${locationId}/catches/${catchId}/like`, {
    method: "DELETE",
  });
  await throwIfNotOk(res);
  return res.json() as Promise<CatchLikeResponse>;
}

export async function fetchCatchComments(
  locationId: number,
  catchId: number,
  offset = 0,
  limit = 3,
): Promise<CatchCommentsPageResponse> {
  const res = await authenticatedFetch(
    `/api/locations/${locationId}/catches/${catchId}/comments?offset=${offset}&limit=${limit}`,
  );
  await throwIfNotOk(res);
  return res.json() as Promise<CatchCommentsPageResponse>;
}

export async function createCatchComment(
  locationId: number,
  catchId: number,
  message: string,
): Promise<CatchCommentResponse> {
  const res = await authenticatedFetch(
    `/api/locations/${locationId}/catches/${catchId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<CatchCommentResponse>;
}

export async function deleteCatchComment(
  locationId: number,
  catchId: number,
  commentId: number,
): Promise<void> {
  const res = await authenticatedFetch(
    `/api/locations/${locationId}/catches/${catchId}/comments/${commentId}`,
    { method: "DELETE" },
  );
  await throwIfNotOk(res);
}

export async function deleteCatch(
  locationId: number,
  catchId: number,
): Promise<void> {
  const res = await authenticatedFetch(
    `/api/locations/${locationId}/catches/${catchId}`,
    { method: "DELETE" },
  );
  await throwIfNotOk(res);
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

export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  validateImageFileForUpload(file);
  const formData = new FormData();
  formData.append("file", file);
  const res = await authenticatedFetch("/api/storage/images", {
    method: "POST",
    body: formData,
  });
  await throwIfNotOk(res);
  return res.json() as Promise<ImageUploadResponse>;
}

export async function identifyFishFromImage(
  file: File,
): Promise<FishIdentificationResponse> {
  validateImageFileForUpload(file);
  const formData = new FormData();
  formData.append("file", file);
  const res = await authenticatedFetch("/api/ai/identify-fish", {
    method: "POST",
    body: formData,
  });
  await throwIfNotOk(res);
  return res.json() as Promise<FishIdentificationResponse>;
}

export async function getImageUrl(objectKey: string): Promise<string> {
  const res = await authenticatedFetch(
    `/api/storage/images/download-url?key=${encodeURIComponent(objectKey)}`,
  );
  await throwIfNotOk(res);
  const data = (await res.json()) as { url: string; expiresInSeconds: number };
  return data.url;
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
