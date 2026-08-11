import type { PdfHighlight } from "../types";

/** What to do with highlights that don't belong to the current waypoint. */
export type InactiveHighlights = "show" | "dim" | "hide";

/**
 * Text highlights quote the paper, so they should read as marker pen.
 *
 * Area highlights are drawn around figures and tables, where they exist to
 * anchor the scroll rather than to claim the whole figure is "the highlighted
 * bit" — a full-strength wash over a figure is both ugly and misleading. They
 * get a tint faint enough to disappear on a projector; the accent outline on
 * the active highlight is what actually points at it.
 */
export const TEXT_ALPHA = 0.35;
export const AREA_ALPHA = 0.1;

/** Multiplier applied to highlights that aren't the current waypoint's. */
export const INACTIVE_DIM = 0.25;

/** Matches the top offset the highlighter library's own scrollToHighlight applies. */
export const LIB_SCROLL_MARGIN = 10;

/**
 * Narrows the set drawn on the page. Only "hide" removes anything, and only
 * once a waypoint has actually claimed a highlight — otherwise a waypoint with
 * no highlight would blank the page rather than leave it alone.
 */
export function visibleHighlights(
  highlights: PdfHighlight[],
  activeId: string | null | undefined,
  mode: InactiveHighlights,
): PdfHighlight[] {
  if (mode !== "hide" || activeId == null) return highlights;
  return highlights.filter((highlight) => highlight.id === activeId);
}

/** Fill opacity for one highlight, given what kind it is and whether it's current. */
export function highlightAlpha(opts: {
  isText: boolean;
  highlightId: string;
  activeId: string | null | undefined;
  mode: InactiveHighlights;
}): number {
  const base = opts.isText ? TEXT_ALPHA : AREA_ALPHA;
  const isInactive = opts.activeId != null && opts.highlightId !== opts.activeId;
  return isInactive && opts.mode === "dim" ? base * INACTIVE_DIM : base;
}

/**
 * How far to nudge the scroll after the library's top-anchored scrollToHighlight
 * so the highlight ends up centred instead. Negative scrolls back up the page.
 *
 * Returns 0 for a highlight taller than the viewport, where centring would push
 * its opening lines off-screen — those keep the top-anchored behaviour.
 */
export function centeringScrollOffset(
  highlightHeight: number,
  containerHeight: number,
  topMargin: number = LIB_SCROLL_MARGIN,
): number {
  if (highlightHeight >= containerHeight - 2 * topMargin) return 0;
  return topMargin + highlightHeight / 2 - containerHeight / 2;
}
