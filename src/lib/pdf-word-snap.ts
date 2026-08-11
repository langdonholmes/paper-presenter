import type { ScaledPosition, Scaled } from "react-pdf-highlighter-extended";
import { columnInk, findGaps, snapSpan, type Gap } from "./snap-to-word";

/**
 * Applies word snapping to real highlight positions by reading the page the
 * viewer has already rendered.
 *
 * Kept apart from snap-to-word.ts, and out of coverage, because everything here
 * needs a live pdf.js viewport and canvas. The arithmetic worth testing lives
 * in snap-to-word.ts.
 */

/** The slice of pdf.js's PageViewport we rely on. */
interface Viewport {
  width: number;
  height: number;
  scale: number;
  convertToPdfPoint(x: number, y: number): number[];
  convertToViewportRectangle(rect: number[]): number[];
}

interface PageView {
  canvas?: HTMLCanvasElement | null;
  viewport?: Viewport;
}

export interface SnapViewer {
  getPageView(index: number): PageView | undefined | null;
}

interface RenderablePage {
  getViewport(options: { scale: number }): Viewport;
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: Viewport;
  }): { promise: Promise<void> };
}

/** The live viewer, which also exposes the document for pages it hasn't drawn. */
export interface SourceViewer extends SnapViewer {
  pdfDocument?: { getPage(pageNumber: number): Promise<RenderablePage> } | null;
}

/** Off-screen render scale for pages the viewer has not drawn. */
const OFFSCREEN_SCALE = 2;

/**
 * A viewer-shaped object with a canvas for every page asked for, rendering the
 * ones pdf.js has unloaded. Snapping every highlight in a project otherwise
 * only works for whichever pages happen to be on screen.
 */
export async function viewerCoveringPages(
  pageNumbers: number[],
  viewer: SourceViewer,
): Promise<SnapViewer> {
  const pages = new Map<number, PageView>();

  for (const pageNumber of pageNumbers) {
    const live = viewer.getPageView(pageNumber - 1);
    if (live?.canvas && live.viewport) {
      pages.set(pageNumber, live);
      continue;
    }

    const pdfDocument = viewer.pdfDocument;
    if (!pdfDocument) continue;

    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: OFFSCREEN_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) continue;
    // pdf.js draws glyphs onto transparency; the scan needs a white ground.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    pages.set(pageNumber, { canvas, viewport });
  }

  return { getPageView: (index) => pages.get(index + 1) };
}

/** A word space in 11pt type is about 2.75pt; letter spacing is well under 1pt. */
const MIN_GAP_PT = 1.2;
/** How far an edge may travel. Beyond this we assume the edge was deliberate. */
const MAX_MOVE_PT = 6;

/**
 * Mirrors the highlighter library's own scaled -> viewport conversion, so a
 * snapped rect stays in exactly the coordinate space it arrived in (points when
 * usePdfCoordinates is set, capture-time pixels otherwise).
 */
function rectToViewport(rect: Scaled, viewport: Viewport, usePdf: boolean) {
  if (usePdf) {
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
      rect.x1,
      rect.y1,
      rect.x2,
      rect.y2,
    ]);
    return {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y1 - y2),
    };
  }
  const sx = viewport.width / rect.width;
  const sy = viewport.height / rect.height;
  return {
    left: rect.x1 * sx,
    top: rect.y1 * sy,
    width: (rect.x2 - rect.x1) * sx,
    height: (rect.y2 - rect.y1) * sy,
  };
}

/** Word gaps along the line a single rect sits on, in that rect's own units. */
function gapsForRect(
  rect: Scaled,
  viewport: Viewport,
  canvas: HTMLCanvasElement,
  usePdf: boolean,
): { gaps: Gap[]; maxMove: number } | null {
  const band = rectToViewport(rect, viewport, usePdf);
  const ratio = canvas.width / viewport.width;

  const top = Math.max(0, Math.round(band.top * ratio));
  const height = Math.min(
    canvas.height - top,
    Math.max(1, Math.round(band.height * ratio)),
  );
  if (height <= 0) return null;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const { data } = context.getImageData(0, top, canvas.width, height);
  const columns = columnInk(data, canvas.width, height);

  // Canvas column -> the rect's own horizontal units.
  const toUnits = usePdf
    ? (index: number) => viewport.convertToPdfPoint(index / ratio, 0)[0]
    : (index: number) => ((index / ratio) * rect.width) / viewport.width;

  const unitsPerPoint = Math.abs(toUnits(viewport.scale * ratio) - toUnits(0));
  const minGapPx = Math.max(1, Math.round(MIN_GAP_PT * viewport.scale * ratio));

  return {
    gaps: findGaps(columns, minGapPx, toUnits),
    maxMove: MAX_MOVE_PT * (unitsPerPoint || 1),
  };
}

/**
 * Nudges each rect of a text highlight onto word boundaries. Area highlights
 * (which carry no rects) and pages the viewer has not rendered are returned
 * untouched.
 */
export function snapPositionToWords(
  position: ScaledPosition,
  viewer: SnapViewer,
): ScaledPosition {
  const rects = position.rects ?? [];
  if (rects.length === 0) return position;

  const usePdf = Boolean(position.usePdfCoordinates);
  let changed = false;

  const snapped = rects.map((rect) => {
    const pageNumber = rect.pageNumber ?? position.boundingRect.pageNumber;
    const pageView = viewer.getPageView((pageNumber ?? 1) - 1);
    const canvas = pageView?.canvas;
    const viewport = pageView?.viewport;
    if (!canvas || !viewport) return rect;

    const found = gapsForRect(rect, viewport, canvas, usePdf);
    if (!found || found.gaps.length === 0) return rect;

    const { x1, x2 } = snapSpan(rect.x1, rect.x2, found.gaps, found.maxMove);
    if (x1 === rect.x1 && x2 === rect.x2) return rect;

    changed = true;
    return { ...rect, x1, x2 };
  });

  if (!changed) return position;

  return {
    ...position,
    rects: snapped,
    boundingRect: {
      ...position.boundingRect,
      x1: Math.min(...snapped.map((rect) => rect.x1)),
      x2: Math.max(...snapped.map((rect) => rect.x2)),
    },
  };
}
