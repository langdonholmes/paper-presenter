import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Narrowest the inspector may go before its form fields stop being usable. */
export const INSPECTOR_MIN_WIDTH = 280;
export const INSPECTOR_DEFAULT_WIDTH = 320;
/** Room the PDF pane keeps whatever the inspector takes. */
export const PDF_MIN_WIDTH = 400;
export const INSPECTOR_STORAGE_KEY = "paper-presenter.inspector-width";

export function clampPanelWidth(width: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.round(Math.min(Math.max(width, min), max));
}

/**
 * Widest the inspector may be inside a window, leaving the waypoint list its
 * fixed column and the PDF pane its minimum.
 */
export function maxPanelWidth(
  windowWidth: number,
  otherColumns: number,
  min: number = INSPECTOR_MIN_WIDTH,
): number {
  return Math.max(min, windowWidth - otherColumns - PDF_MIN_WIDTH);
}

/** A stored width, or the fallback if there is none or it is not a number. */
export function readStoredWidth(
  storage: Pick<Storage, "getItem"> | null | undefined,
  key: string,
  fallback: number,
): number {
  try {
    const raw = storage?.getItem(key);
    const parsed = raw === null || raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Width for a right-hand panel after dragging its left edge. Dragging left
 * (pointer x decreasing) makes the panel wider.
 */
export function draggedWidth(startWidth: number, startX: number, clientX: number): number {
  return startWidth + (startX - clientX);
}

export interface ResizablePanelOptions {
  storageKey?: string;
  defaultWidth?: number;
  min?: number;
  /** Fixed width of the other columns sharing the row (used for the max). */
  otherColumns?: number;
}

export interface ResizablePanel {
  width: number;
  dragging: boolean;
  /** Spread onto the drag handle element. */
  handleProps: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onDoubleClick: () => void;
  };
}

/**
 * Drag-to-resize for a panel on the right edge of the editor. The width is
 * clamped so the PDF pane never collapses, persisted to localStorage, and
 * reset to the default on double-click.
 */
export function useResizablePanel({
  storageKey = INSPECTOR_STORAGE_KEY,
  defaultWidth = INSPECTOR_DEFAULT_WIDTH,
  min = INSPECTOR_MIN_WIDTH,
  otherColumns = 240,
}: ResizablePanelOptions = {}): ResizablePanel {
  const storage = typeof localStorage === "undefined" ? null : localStorage;
  const limit = useCallback(
    (w: number) =>
      clampPanelWidth(w, min, maxPanelWidth(window.innerWidth, otherColumns, min)),
    [min, otherColumns],
  );

  const [width, setWidth] = useState(() =>
    limit(readStoredWidth(storage, storageKey, defaultWidth)),
  );
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;

  const persist = useCallback(
    (w: number) => {
      try {
        storage?.setItem(storageKey, String(w));
      } catch {
        // Storage may be unavailable; the width still applies for the session.
      }
    },
    [storage, storageKey],
  );

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      setWidth(limit(draggedWidth(d.startWidth, d.startX, e.clientX)));
    }

    function onUp() {
      drag.current = null;
      setDragging(false);
      persist(widthRef.current);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [dragging, limit, persist]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag.current = { startX: e.clientX, startWidth: widthRef.current };
      setDragging(true);
    },
    [],
  );

  const onDoubleClick = useCallback(() => {
    const w = limit(defaultWidth);
    setWidth(w);
    persist(w);
  }, [limit, defaultWidth, persist]);

  return { width, dragging, handleProps: { onPointerDown, onDoubleClick } };
}
