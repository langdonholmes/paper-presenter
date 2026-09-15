import { useCallback, useState } from "react";

export const CONTENT_WRAP_KEY = "paper-presenter.content-wrap";

/** A stored boolean, or the fallback when nothing is stored or storage is blocked. */
export function readStoredBoolean(
  storage: Pick<Storage, "getItem"> | null | undefined,
  key: string,
  fallback: boolean,
): boolean {
  try {
    const raw = storage?.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * A boolean editor preference that survives restarts. Editor-wide rather than
 * per project, so it lives in localStorage rather than in the project file.
 */
export function useStoredBoolean(
  key: string,
  fallback: boolean,
): [boolean, (next: boolean) => void] {
  const storage = typeof localStorage === "undefined" ? null : localStorage;
  const [value, setValue] = useState(() => readStoredBoolean(storage, key, fallback));

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        storage?.setItem(key, String(next));
      } catch {
        // Storage may be unavailable; the choice still holds for the session.
      }
    },
    [storage, key],
  );

  return [value, update];
}
