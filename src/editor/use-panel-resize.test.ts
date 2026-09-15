import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  clampPanelWidth,
  draggedWidth,
  maxPanelWidth,
  readStoredWidth,
  useResizablePanel,
  INSPECTOR_DEFAULT_WIDTH,
  INSPECTOR_MIN_WIDTH,
  INSPECTOR_STORAGE_KEY,
  PDF_MIN_WIDTH,
} from "./use-panel-resize";

describe("clampPanelWidth", () => {
  it("bounds and rounds", () => {
    expect(clampPanelWidth(100, 280, 600)).toBe(280);
    expect(clampPanelWidth(900, 280, 600)).toBe(600);
    expect(clampPanelWidth(333.6, 280, 600)).toBe(334);
  });

  it("falls back to min when the window is too narrow for both", () => {
    expect(clampPanelWidth(500, 280, 200)).toBe(280);
  });
});

describe("maxPanelWidth", () => {
  it("leaves the other columns and the PDF minimum", () => {
    expect(maxPanelWidth(1400, 240)).toBe(1400 - 240 - PDF_MIN_WIDTH);
  });

  it("never drops below the panel minimum", () => {
    expect(maxPanelWidth(500, 240)).toBe(INSPECTOR_MIN_WIDTH);
  });
});

describe("readStoredWidth", () => {
  it("parses a stored number", () => {
    const storage = { getItem: () => "410" };
    expect(readStoredWidth(storage, "k", 320)).toBe(410);
  });

  it("falls back on missing, junk, non-positive, or throwing storage", () => {
    expect(readStoredWidth({ getItem: () => null }, "k", 320)).toBe(320);
    expect(readStoredWidth({ getItem: () => "wide" }, "k", 320)).toBe(320);
    expect(readStoredWidth({ getItem: () => "0" }, "k", 320)).toBe(320);
    expect(readStoredWidth(null, "k", 320)).toBe(320);
    expect(
      readStoredWidth(
        {
          getItem: () => {
            throw new Error("blocked");
          },
        },
        "k",
        320,
      ),
    ).toBe(320);
  });
});

describe("draggedWidth", () => {
  it("widens when the pointer moves left", () => {
    expect(draggedWidth(320, 1000, 900)).toBe(420);
    expect(draggedWidth(320, 1000, 1050)).toBe(270);
  });
});

describe("useResizablePanel", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  function pointerDown(result: { current: ReturnType<typeof useResizablePanel> }, x: number) {
    act(() => {
      result.current.handleProps.onPointerDown({
        button: 0,
        clientX: x,
        preventDefault: () => {},
      } as unknown as ReactPointerEvent);
    });
  }

  it("starts at the default and restores a stored width", () => {
    const { result: fresh } = renderHook(() => useResizablePanel());
    expect(fresh.current.width).toBe(INSPECTOR_DEFAULT_WIDTH);

    localStorage.setItem(INSPECTOR_STORAGE_KEY, "450");
    const { result: stored } = renderHook(() => useResizablePanel());
    expect(stored.current.width).toBe(450);
  });

  it("clamps a stored width to what the window allows", () => {
    localStorage.setItem(INSPECTOR_STORAGE_KEY, "5000");
    const { result } = renderHook(() => useResizablePanel());
    expect(result.current.width).toBe(1400 - 240 - PDF_MIN_WIDTH);
  });

  it("resizes with a drag, persists on release, and restores the cursor", () => {
    const { result } = renderHook(() => useResizablePanel());

    pointerDown(result, 1000);
    expect(result.current.dragging).toBe(true);
    expect(document.body.style.cursor).toBe("col-resize");

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 900 }));
    });
    expect(result.current.width).toBe(INSPECTOR_DEFAULT_WIDTH + 100);

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"));
    });
    expect(result.current.dragging).toBe(false);
    expect(document.body.style.cursor).toBe("");
    expect(localStorage.getItem(INSPECTOR_STORAGE_KEY)).toBe(
      String(INSPECTOR_DEFAULT_WIDTH + 100),
    );
  });

  it("never lets the PDF pane collapse", () => {
    const { result } = renderHook(() => useResizablePanel());
    pointerDown(result, 1000);
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: -5000 }));
    });
    expect(result.current.width).toBe(1400 - 240 - PDF_MIN_WIDTH);

    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 5000 }));
    });
    expect(result.current.width).toBe(INSPECTOR_MIN_WIDTH);
    act(() => {
      window.dispatchEvent(new PointerEvent("pointercancel"));
    });
  });

  it("ignores moves after release and non-primary buttons", () => {
    const { result } = renderHook(() => useResizablePanel());

    act(() => {
      result.current.handleProps.onPointerDown({
        button: 2,
        clientX: 1000,
        preventDefault: () => {},
      } as unknown as ReactPointerEvent);
    });
    expect(result.current.dragging).toBe(false);

    pointerDown(result, 1000);
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 500 }));
    });
    expect(result.current.width).toBe(INSPECTOR_DEFAULT_WIDTH);
  });

  it("double-click resets to the default", () => {
    localStorage.setItem(INSPECTOR_STORAGE_KEY, "500");
    const { result } = renderHook(() => useResizablePanel());
    expect(result.current.width).toBe(500);

    act(() => {
      result.current.handleProps.onDoubleClick();
    });
    expect(result.current.width).toBe(INSPECTOR_DEFAULT_WIDTH);
    expect(localStorage.getItem(INSPECTOR_STORAGE_KEY)).toBe(
      String(INSPECTOR_DEFAULT_WIDTH),
    );
  });

  it("keeps working when storage throws", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    const { result } = renderHook(() => useResizablePanel());
    act(() => {
      result.current.handleProps.onDoubleClick();
    });
    expect(result.current.width).toBe(INSPECTOR_DEFAULT_WIDTH);
    setItem.mockRestore();
  });
});
