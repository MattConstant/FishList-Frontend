/**
 * FishList Spring API — HTTP Basic auth (see FishList SecurityConfig).
 */

const SESSION_KEY = "fishlist-session";

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

export type AccountResponse = {
  id: number;
  username: string;
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
    if (
      err.code === "VALIDATION_ERROR" &&
      err.fieldErrors &&
      Object.keys(err.fieldErrors).length > 0
    ) {
      return Object.values(err.fieldErrors).join(", ");
    }
    if (err.status === 401) return "Invalid credentials.";
    if (err.status === 403) return "You are not allowed to do that.";
    if (err.status === 404) return "The requested item was not found.";
    if (err.status === 409) return "That value is already in use.";
    if (err.status >= 500) return "Server error. Please try again.";
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8080"
  );
}

/** RFC 7617–friendly Basic header for UTF-8 credentials. */
export function buildBasicAuthorization(
  username: string,
  password: string,
): string {
  const raw = `${username}:${password}`;
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `Basic ${btoa(binary)}`;
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

export async function registerAccount(
  username: string,
  password: string,
): Promise<AccountResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
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

/**
 * Calls the API with the stored Basic credentials. Clears session on 401.
 */
export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = loadSession();
  if (!session) throw new Error("Not authenticated");

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

// ── Image upload ────────────────────────────────────────────────────

export type ImageUploadResponse = {
  bucket: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  getUrl: string;
};

export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authenticatedFetch("/api/storage/images", {
    method: "POST",
    body: formData,
  });
  await throwIfNotOk(res);
  return res.json() as Promise<ImageUploadResponse>;
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
