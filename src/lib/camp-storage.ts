import type { CampSpotResponse, PostVisibility } from "@/lib/api";

type StoredCamp = {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  timeStamp: string;
  accountId: number;
  username: string;
  visibility?: PostVisibility | null;
  /** Object keys or absolute URLs (same conventions as catches). */
  imageUrls?: string[];
};

const STORAGE_KEY = "fishlist-camps-v1";

function safeRead(): StoredCamp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as StoredCamp[];
  } catch {
    return [];
  }
}

function safeWrite(list: StoredCamp[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

export function listLocalCampsForUser(accountId: number): StoredCamp[] {
  return safeRead().filter((c) => c.accountId === accountId);
}

export function upsertLocalCamp(camp: StoredCamp): void {
  const all = safeRead();
  const next = [camp, ...all.filter((c) => c.id !== camp.id)];
  safeWrite(next.slice(0, 1000));
}

export function deleteLocalCamp(id: number, accountId: number): void {
  const all = safeRead();
  safeWrite(all.filter((c) => !(c.accountId === accountId && c.id === id)));
}

export function toCampSpotResponse(c: StoredCamp): CampSpotResponse & { imageUrls?: string[] } {
  return c;
}

