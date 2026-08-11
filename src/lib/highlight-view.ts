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
export const AREA_ALPHA = 0.18;

/**
 * Area highlights carry an outline as well as a wash. A tint faint enough not
 * to discolour a figure is also faint enough to be invisible in the paler
 * palette colours, so the outline is what actually says "this region", leaving
 * the fill free to stay light.
 */
export const AREA_BORDER_ALPHA = 0.8;

/** Multiplier applied to highlights that aren't the current waypoint's. */
export const INACTIVE_DIM = 0.25;

/**
 * A darker cousin of a palette colour. The palette is pastel, which reads as
 * washed out against a white page, so the outline is drawn in a shaded version
 * of the highlight's own colour rather than the colour itself.
 */
export function darken(rgb: string, amount = 0.45): string {
  return rgb
    .split(",")
    .map((channel) => Math.round(Number(channel.trim()) * (1 - amount)))
    .join(", ");
}

/** Matches the top offset the highlighter library's own scrollToHighlight applies. */
export const LIB_SCROLL_MARGIN = 10;

/**
 * Fill opacity for one highlight, given what kind it is and whether it belongs
 * to the current waypoint.
 *
 * Hiding is done by painting a highlight fully transparent rather than by
 * dropping it from the array handed to the viewer. The viewer keys highlights
 * by their index within a page and rebuilds its layers whenever that array
 * changes, so filtering it made the focal highlight vanish when moving quickly
 * between waypoints. Opacity keeps the array stable and identical to what the
 * viewer saw before any focus behaviour existed.
 */
export interface PaintOpts {
  isText: boolean;
  highlightId: string;
  activeId: string | null | undefined;
  mode: InactiveHighlights;
}

/** How much of a highlight's paint survives, given whether it is the current one. */
function visibility(opts: PaintOpts): number {
  const isInactive = opts.activeId != null && opts.highlightId !== opts.activeId;
  if (!isInactive) return 1;
  if (opts.mode === "hide") return 0;
  if (opts.mode === "dim") return INACTIVE_DIM;
  return 1;
}

export function highlightAlpha(opts: PaintOpts): number {
  return (opts.isText ? TEXT_ALPHA : AREA_ALPHA) * visibility(opts);
}

/**
 * Outline opacity. Text highlights get none — marker pen has no edges — so this
 * is zero for them, which the caller reads as "draw no border".
 */
export function highlightBorderAlpha(opts: PaintOpts): number {
  if (opts.isText) return 0;
  return AREA_BORDER_ALPHA * visibility(opts);
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
