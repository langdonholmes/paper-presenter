import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { clampedNav, useKeyboardNav } from "./use-keyboard-nav";

describe("clampedNav", () => {
  it("increments within bounds", () => {
    expect(clampedNav(0, 1, 5)).toBe(1);
    expect(clampedNav(2, 1, 5)).toBe(3);
  });

  it("decrements within bounds", () => {
    expect(clampedNav(3, -1, 5)).toBe(2);
    expect(clampedNav(1, -1, 5)).toBe(0);
  });

  it("clamps at 0", () => {
    expect(clampedNav(0, -1, 5)).toBe(0);
    expect(clampedNav(0, -10, 5)).toBe(0);
  });

  it("clamps at max", () => {
    expect(clampedNav(4, 1, 5)).toBe(4);
    expect(clampedNav(3, 10, 5)).toBe(4);
  });

  it("returns 0 for empty list", () => {
    expect(clampedNav(0, 1, 0)).toBe(0);
    expect(clampedNav(0, -1, 0)).toBe(0);
  });
});

// ── useKeyboardNav hook ──

function fireKey(key: string, target?: EventTarget) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true });
  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }
  window.dispatchEvent(event);
}

describe("useKeyboardNav", () => {
  it("starts at index 0", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    expect(result.current.index).toBe(0);
  });

  it("ArrowRight increments index", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    act(() => fireKey("ArrowRight"));
    expect(result.current.index).toBe(1);
  });

  it("ArrowDown increments index", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    act(() => fireKey("ArrowDown"));
    expect(result.current.index).toBe(1);
  });

  it("ArrowLeft decrements index", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    act(() => fireKey("ArrowRight"));
    act(() => fireKey("ArrowRight"));
    expect(result.current.index).toBe(2);
    act(() => fireKey("ArrowLeft"));
    expect(result.current.index).toBe(1);
  });

  it("ArrowUp decrements index", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    act(() => fireKey("ArrowRight"));
    act(() => fireKey("ArrowUp"));
    expect(result.current.index).toBe(0);
  });

  it("does not go below 0", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    act(() => fireKey("ArrowLeft"));
    expect(result.current.index).toBe(0);
  });

  it("does not go above length-1", () => {
    const { result } = renderHook(() => useKeyboardNav(3));
    act(() => fireKey("ArrowRight"));
    act(() => fireKey("ArrowRight"));
    act(() => fireKey("ArrowRight"));
    act(() => fireKey("ArrowRight"));
    expect(result.current.index).toBe(2);
  });

  it("ignores keys when target is INPUT", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    const input = document.createElement("input");
    act(() => fireKey("ArrowRight", input));
    expect(result.current.index).toBe(0);
  });

  it("ignores keys when target is TEXTAREA", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    const textarea = document.createElement("textarea");
    act(() => fireKey("ArrowRight", textarea));
    expect(result.current.index).toBe(0);
  });

  it("setIndex updates index externally", () => {
    const { result } = renderHook(() => useKeyboardNav(5));
    act(() => result.current.setIndex(3));
    expect(result.current.index).toBe(3);
  });

  it("removes event listener on unmount", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useKeyboardNav(5));
    unmount();
    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
    spy.mockRestore();
  });
});
