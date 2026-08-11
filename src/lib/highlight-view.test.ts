import { describe, it, expect } from "vitest";
import type { PdfHighlight } from "../types";
import {
  visibleHighlights,
  highlightAlpha,
  centeringScrollOffset,
  TEXT_ALPHA,
  AREA_ALPHA,
  INACTIVE_DIM,
} from "./highlight-view";

function highlight(id: string): PdfHighlight {
  return {
    id,
    label: id,
    position: {
      boundingRect: {
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
        width: 612,
        height: 792,
        pageNumber: 1,
      },
      rects: [],
      usePdfCoordinates: true,
    },
    content: {},
    color: "yellow",
  };
}

const DECK = [highlight("a"), highlight("b"), highlight("c")];

describe("visibleHighlights", () => {
  it("keeps only the active highlight when hiding", () => {
    expect(visibleHighlights(DECK, "b", "hide")).toEqual([DECK[1]]);
  });

  it("keeps everything when dimming or showing", () => {
    expect(visibleHighlights(DECK, "b", "dim")).toBe(DECK);
    expect(visibleHighlights(DECK, "b", "show")).toBe(DECK);
  });

  it("leaves the page alone when no waypoint claims a highlight", () => {
    expect(visibleHighlights(DECK, null, "hide")).toBe(DECK);
    expect(visibleHighlights(DECK, undefined, "hide")).toBe(DECK);
  });

  it("hides everything when the active highlight is not in the deck", () => {
    expect(visibleHighlights(DECK, "gone", "hide")).toEqual([]);
  });
});

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

  it("does not dim under show or hide", () => {
    for (const mode of ["show", "hide"] as const) {
      expect(
        highlightAlpha({
          isText: true,
          highlightId: "b",
          activeId: "a",
          mode,
        }),
      ).toBe(TEXT_ALPHA);
    }
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
