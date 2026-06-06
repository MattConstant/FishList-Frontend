import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

function tryGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function trySetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export type SyncedBooleanPrefVariant =
  /** Default `false`; becomes `true` only when storage is the string `"true"`. */
  | "off-unless-true"
  /** Default `true`; becomes `false` only when storage is the string `"false"`. */
  | "on-unless-false";

/**
 * Boolean state mirrored to `localStorage`. The first write after mount is skipped
 * so a hydration pass from storage is not overwritten by the default.
 */
export function useSyncedBooleanPref(
  key: string,
  variant: SyncedBooleanPrefVariant,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState(variant === "on-unless-false");
  const skipNextSave = useRef(true);

  useEffect(() => {
    const raw = tryGetItem(key);
    /* Hydrate from localStorage after mount so the first paint matches SSR/default (same pattern as the map page before extraction). */
    /* eslint-disable react-hooks/set-state-in-effect -- external store read; not derivable without hydration mismatch */
    if (variant === "off-unless-true") {
      if (raw === "true") setValue(true);
    } else if (raw === "false") {
      setValue(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [key, variant]);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    trySetItem(key, String(value));
  }, [key, value]);

  return [value, setValue];
}
