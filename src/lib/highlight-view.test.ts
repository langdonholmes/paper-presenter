import { describe, it, expect } from "vitest";
import {
  highlightAlpha,
  centeringScrollOffset,
  TEXT_ALPHA,
  AREA_ALPHA,
  INACTIVE_DIM,
} from "./highlight-view";

describe("highlightAlpha", () => {
  it("gives text highlights marker-pen strength", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "a",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(TEXT_ALPHA);
  });

  it("gives area highlights a much fainter wash", () => {
    expect(
      highlightAlpha({
        isText: false,
        highlightId: "a",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(AREA_ALPHA);
  });

  it("dims a highlight that is not the current one", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "b",
        activeId: "a",
        mode: "dim",
      }),
    ).toBeCloseTo(TEXT_ALPHA * INACTIVE_DIM);
  });

  it("does not dim the current highlight", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "a",
        activeId: "a",
        mode: "dim",
      }),
    ).toBe(TEXT_ALPHA);
  });

  it("does not dim anything when no highlight is active", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "b",
        activeId: null,
        mode: "dim",
      }),
    ).toBe(TEXT_ALPHA);
  });

  it("paints an inactive highlight away entirely when hiding", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "b",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(0);
    expect(
      highlightAlpha({
        isText: false,
        highlightId: "b",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(0);
  });

  it("leaves everything alone under show", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "b",
        activeId: "a",
        mode: "show",
      }),
    ).toBe(TEXT_ALPHA);
  });

  it("never hides the highlight that is current", () => {
    expect(
      highlightAlpha({
        isText: true,
        highlightId: "a",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(TEXT_ALPHA);
  });
});

describe("centeringScrollOffset", () => {
  it("scrolls back up the page, since the library anchors to the top", () => {
    // 40px highlight parked at y=10 in an 800px viewport: its centre sits at 30,
    // and needs to reach 400, so the page must scroll up by 370.
    expect(centeringScrollOffset(40, 800)).toBe(-370);
  });

  it("centres a tall-but-fitting highlight", () => {
    expect(centeringScrollOffset(600, 800)).toBe(-90);
  });

  it("leaves highlights taller than the viewport top-anchored", () => {
    expect(centeringScrollOffset(800, 800)).toBe(0);
    expect(centeringScrollOffset(1200, 800)).toBe(0);
  });

  it("treats the margin as part of the usable height", () => {
    // 780 is exactly containerHeight - 2 * margin, so it counts as too tall.
    expect(centeringScrollOffset(780, 800)).toBe(0);
    expect(centeringScrollOffset(779, 800)).not.toBe(0);
  });

  it("honours a custom top margin", () => {
    expect(centeringScrollOffset(40, 800, 0)).toBe(-380);
  });
});
