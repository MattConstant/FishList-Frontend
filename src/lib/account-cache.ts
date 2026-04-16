import { fetchAccountById, type AccountResponse } from "@/lib/api";

const cache = new Map<number, Promise<AccountResponse | null>>();

/** Dedupes concurrent profile fetches (e.g. feed avatars). Failed lookups resolve to null. */
export function getAccountWithAvatarCache(
  accountId: number,
): Promise<AccountResponse | null> {
  const hit = cache.get(accountId);
  if (hit) return hit;
  const p = fetchAccountById(accountId)
    .then((a) => a)
    .catch(() => null);
  cache.set(accountId, p);
  return p;
}
