import { describe, it, expect } from "vitest";
import {
  highlightAlpha,
  highlightBorderAlpha,
  highlightOutlined,
  darken,
  centeringScrollOffset,
  alignScrollOffset,
  TEXT_ALPHA,
  AREA_ALPHA,
  AREA_BORDER_ALPHA,
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

describe("highlightBorderAlpha", () => {
  it("outlines an area highlight", () => {
    expect(
      highlightBorderAlpha({
        isText: false,
        highlightId: "a",
        activeId: "a",
        mode: "dim",
      }),
    ).toBe(AREA_BORDER_ALPHA);
  });

  it("never outlines a text highlight", () => {
    for (const mode of ["show", "dim", "hide"] as const) {
      expect(
        highlightBorderAlpha({
          isText: true,
          highlightId: "a",
          activeId: "a",
          mode,
        }),
      ).toBe(0);
    }
  });

  it("fades the outline along with the fill when dimming", () => {
    expect(
      highlightBorderAlpha({
        isText: false,
        highlightId: "b",
        activeId: "a",
        mode: "dim",
      }),
    ).toBeCloseTo(AREA_BORDER_ALPHA * INACTIVE_DIM);
  });

  it("removes the outline entirely when hiding", () => {
    expect(
      highlightBorderAlpha({
        isText: false,
        highlightId: "b",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(0);
  });
});

describe("highlightOutlined", () => {
  it("rings the current highlight when others are visible", () => {
    for (const mode of ["show", "dim"] as const) {
      expect(
        highlightOutlined({
          isText: true,
          highlightId: "a",
          activeId: "a",
          mode,
        }),
      ).toBe(true);
    }
  });

  it("does not ring the others", () => {
    expect(
      highlightOutlined({
        isText: true,
        highlightId: "b",
        activeId: "a",
        mode: "dim",
      }),
    ).toBe(false);
  });

  it("skips the ring when nothing else is on the page to distinguish it from", () => {
    expect(
      highlightOutlined({
        isText: true,
        highlightId: "a",
        activeId: "a",
        mode: "hide",
      }),
    ).toBe(false);
  });

  it("rings nothing when no waypoint has claimed a highlight", () => {
    expect(
      highlightOutlined({
        isText: true,
        highlightId: "a",
        activeId: null,
        mode: "dim",
      }),
    ).toBe(false);
  });
});

describe("darken", () => {
  it("shades every channel of a palette triplet", () => {
    expect(darken("250, 179, 135", 0.45)).toBe("138, 98, 74");
  });

  it("tolerates the palette's spacing", () => {
    expect(darken("250,204,21", 0.5)).toBe("125, 102, 11");
  });

  it("leaves a colour alone at zero and blacks it out at one", () => {
    expect(darken("10, 20, 30", 0)).toBe("10, 20, 30");
    expect(darken("10, 20, 30", 1)).toBe("0, 0, 0");
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

describe("alignScrollOffset", () => {
  it("leaves a top-aligned highlight where the library parked it", () => {
    expect(alignScrollOffset("top", 40, 800)).toBe(0);
    expect(alignScrollOffset("top", 1200, 800)).toBe(0);
  });

  it("centres like centeringScrollOffset", () => {
    expect(alignScrollOffset("center", 40, 800)).toBe(
      centeringScrollOffset(40, 800),
    );
  });

  it("drops a bottom-aligned highlight to the foot of the viewport", () => {
    // 40px highlight parked at y=10 in an 800px viewport: its foot sits at 50,
    // and needs to reach 790, so the page must scroll back up by 740.
    expect(alignScrollOffset("bottom", 40, 800)).toBe(-740);
  });

  it("leaves highlights taller than the viewport top-anchored", () => {
    expect(alignScrollOffset("bottom", 800, 800)).toBe(0);
    expect(alignScrollOffset("center", 800, 800)).toBe(0);
  });

  it("honours a custom top margin", () => {
    expect(alignScrollOffset("bottom", 40, 800, 0)).toBe(-760);
  });
});
