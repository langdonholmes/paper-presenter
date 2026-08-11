import { describe, it, expect } from "vitest";
import { columnInk, findGaps, snapEdge, snapSpan, type Gap } from "./snap-to-word";

/** Builds RGBA data for a band where the given column ranges are black. */
function band(width: number, height: number, inked: Array<[number, number]>) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const [from, to] of inked) {
    for (let y = 0; y < height; y++) {
      for (let x = from; x < to; x++) {
        const i = (y * width + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  }
  return data;
}

describe("columnInk", () => {
  it("marks only the inked columns", () => {
    const columns = columnInk(band(10, 3, [[2, 5]]), 10, 3);
    expect(Array.from(columns)).toEqual([0, 0, 1, 1, 1, 0, 0, 0, 0, 0]);
  });

  it("catches ink present on any row of the band", () => {
    const data = band(6, 4, []);
    const i = (3 * 6 + 4) * 4; // one black pixel, last row
    data[i] = data[i + 1] = data[i + 2] = 0;
    expect(Array.from(columnInk(data, 6, 4))).toEqual([0, 0, 0, 0, 1, 0]);
  });

  it("treats light grey as blank and dark grey as ink", () => {
    const data = new Uint8ClampedArray(2 * 1 * 4).fill(255);
    data[0] = data[1] = data[2] = 230; // above threshold
    data[4] = data[5] = data[6] = 120; // below threshold
    expect(Array.from(columnInk(data, 2, 1))).toEqual([0, 1]);
  });
});

describe("findGaps", () => {
  const columns = [0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0];

  it("finds leading, internal and trailing blank runs", () => {
    expect(findGaps(columns)).toEqual([
      { x1: 0, x2: 2 },
      { x1: 4, x2: 5 },
      { x1: 8, x2: 11 },
      { x1: 12, x2: 13 },
    ]);
  });

  it("ignores runs narrower than the minimum", () => {
    expect(findGaps(columns, 2)).toEqual([
      { x1: 0, x2: 2 },
      { x1: 8, x2: 11 },
    ]);
  });

  it("converts to caller units", () => {
    expect(findGaps([0, 1], 1, (i) => i * 10)).toEqual([{ x1: 0, x2: 10 }]);
  });

  it("keeps gaps ordered when the unit mapping is descending", () => {
    expect(findGaps([0, 1], 1, (i) => 10 - i)).toEqual([{ x1: 9, x2: 10 }]);
  });

  it("returns nothing for a fully inked band", () => {
    expect(findGaps([1, 1, 1])).toEqual([]);
  });
});

describe("snapEdge", () => {
  // gap  word A   gap   word B   gap   word C   gap
  // 0-6  6-26   26-30   30-50  50-54   54-74   74-80
  const gaps: Gap[] = [
    { x1: 0, x2: 6 },
    { x1: 26, x2: 30 },
    { x1: 50, x2: 54 },
    { x1: 74, x2: 80 },
  ];

  it("tightens a start edge sitting in whitespace onto the next word", () => {
    expect(snapEdge(28, gaps, 6, "start")).toBe(30);
  });

  it("tightens an end edge sitting in whitespace onto the previous word", () => {
    expect(snapEdge(28, gaps, 6, "end")).toBe(26);
  });

  it("gives up a word the start edge had only clipped", () => {
    // 24 sits two units inside word A; the intent was to start at word B
    expect(snapEdge(24, gaps, 6, "start")).toBe(30);
  });

  it("completes a word the end edge had only clipped", () => {
    // 71 stops three units short of the end of word C
    expect(snapEdge(71, gaps, 6, "end")).toBe(74);
  });

  it("refuses to move an edge stranded mid-word", () => {
    expect(snapEdge(40, gaps, 6, "start")).toBe(40);
  });

  it("honours a wider move allowance", () => {
    expect(snapEdge(40, gaps, 20, "start")).toBe(30);
  });

  it("leaves the edge alone when there are no gaps at all", () => {
    expect(snapEdge(42, [])).toBe(42);
  });
});

describe("snapSpan", () => {
  const gaps: Gap[] = [
    { x1: 0, x2: 6 },
    { x1: 26, x2: 30 },
    { x1: 50, x2: 54 },
    { x1: 74, x2: 80 },
  ];

  it("fixes the reported case: leading crumb and clipped final word", () => {
    // Intent was words B and C. The start drifted back into A, and the end
    // stopped short inside C.
    expect(snapSpan(24, 71, gaps)).toEqual({ x1: 30, x2: 74 });
  });

  it("tightens a span that was already roughly right", () => {
    expect(snapSpan(29, 51, gaps)).toEqual({ x1: 30, x2: 50 });
  });

  it("leaves a span alone rather than collapsing it", () => {
    expect(snapSpan(27, 28, gaps)).toEqual({ x1: 27, x2: 28 });
  });

  it("leaves both edges alone when neither is near a gap", () => {
    expect(snapSpan(38, 42, gaps)).toEqual({ x1: 38, x2: 42 });
  });
});
