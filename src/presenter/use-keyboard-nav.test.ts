import { describe, it, expect } from "vitest";
import { clampedNav } from "./use-keyboard-nav";

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
