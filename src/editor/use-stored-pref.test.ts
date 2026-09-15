import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { readStoredBoolean, useStoredBoolean } from "./use-stored-pref";

describe("readStoredBoolean", () => {
  it("reads true and false", () => {
    expect(readStoredBoolean({ getItem: () => "true" }, "k", false)).toBe(true);
    expect(readStoredBoolean({ getItem: () => "false" }, "k", true)).toBe(false);
  });

  it("falls back on missing, junk, or throwing storage", () => {
    expect(readStoredBoolean({ getItem: () => null }, "k", true)).toBe(true);
    expect(readStoredBoolean({ getItem: () => "yes" }, "k", false)).toBe(false);
    expect(readStoredBoolean(null, "k", true)).toBe(true);
    expect(
      readStoredBoolean(
        {
          getItem: () => {
            throw new Error("blocked");
          },
        },
        "k",
        false,
      ),
    ).toBe(false);
  });
});

describe("useStoredBoolean", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts from storage and persists updates", () => {
    localStorage.setItem("pref", "true");
    const { result } = renderHook(() => useStoredBoolean("pref", false));
    expect(result.current[0]).toBe(true);

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem("pref")).toBe("false");
  });

  it("keeps the in-memory value when storage throws", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useStoredBoolean("pref", false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    setItem.mockRestore();
  });
});
