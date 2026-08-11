/**
 * Snapping highlight edges to word boundaries.
 *
 * Highlight rectangles come from selection geometry that is only approximately
 * aligned to the glyphs underneath: an edge can sit a point or two inside a
 * neighbouring word, so a highlight catches the tail of the word before it or
 * clips the last letter of its own. Reading the rendered page tells us where
 * the whitespace between words actually is, and an edge parked in whitespace
 * cannot cut a word in half.
 *
 * These functions are unit-agnostic — gaps and edges just have to agree.
 */

/** A run of blank space between two inked runs. */
export interface Gap {
  x1: number;
  x2: number;
}

/**
 * Which columns of an RGBA image band contain ink.
 *
 * The band should cover exactly one line of text, so that descenders from the
 * line above cannot fill in the gaps we are looking for.
 */
export function columnInk(
  data: ArrayLike<number>,
  width: number,
  height: number,
  threshold = 200,
): Uint8Array {
  const columns = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (columns[x]) continue;
      const i = (row + x) * 4;
      const luminance =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luminance < threshold) columns[x] = 1;
    }
  }
  return columns;
}

/**
 * Blank runs at least `minWidth` columns wide, so that the space between two
 * letters does not read as a word boundary. Runs at the start and end of the
 * band count too, giving an edge at the beginning or end of a line somewhere
 * to snap to.
 *
 * `minWidth` is in column indices; `toUnits` converts an index to whatever
 * units the edges being snapped are expressed in.
 */
export function findGaps(
  columns: ArrayLike<number>,
  minWidth = 1,
  toUnits: (index: number) => number = (index) => index,
): Gap[] {
  const gaps: Gap[] = [];
  let start = -1;

  const close = (end: number) => {
    if (end - start >= minWidth) {
      const a = toUnits(start);
      const b = toUnits(end);
      gaps.push(a <= b ? { x1: a, x2: b } : { x1: b, x2: a });
    }
    start = -1;
  };

  for (let i = 0; i < columns.length; i++) {
    if (!columns[i]) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      close(i);
    }
  }
  if (start >= 0) close(columns.length);

  return gaps;
}

/**
 * Moves one edge to the nearest word boundary.
 *
 * The nearest gap is chosen by distance, then the edge lands on whichever side
 * of it hugs the text: a span's start goes to the gap's right, its end to the
 * gap's left. So an edge that drifted into the previous word gives that word
 * up entirely, and one that stopped short of its own word's last letter takes
 * the whole letter — never half of either.
 *
 * An edge further than `maxMove` from any gap is left alone, so a deliberately
 * mid-word edge and anything the page scan misread both survive untouched.
 */
export function snapEdge(
  x: number,
  gaps: Gap[],
  maxMove = 6,
  side: "start" | "end" = "start",
): number {
  let best = x;
  let bestDistance = Infinity;

  for (const gap of gaps) {
    const nearest = x < gap.x1 ? gap.x1 : x > gap.x2 ? gap.x2 : x;
    const distance = Math.abs(nearest - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = side === "start" ? gap.x2 : gap.x1;
    }
  }

  return bestDistance <= maxMove ? best : x;
}

/**
 * Snaps both edges of a span, refusing a result that would invert or empty it —
 * better to leave a span alone than to collapse it onto a single point.
 */
export function snapSpan(
  x1: number,
  x2: number,
  gaps: Gap[],
  maxMove = 6,
): { x1: number; x2: number } {
  const left = snapEdge(x1, gaps, maxMove, "start");
  const right = snapEdge(x2, gaps, maxMove, "end");
  if (right - left < 1) return { x1, x2 };
  return { x1: left, x2: right };
}
