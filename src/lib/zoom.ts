/**
 * Zoom arithmetic for the PDF viewer, kept apart from PdfViewer.tsx so it can
 * be tested without a live pdf.js viewport.
 *
 * "auto" is pdf.js's fit-to-width; a number is a plain scale factor.
 */
export type ZoomValue = number | "auto";

export const ZOOM_STEP = 0.1;
/** Ctrl+wheel and trackpad pinch fire many events per gesture, so each one moves less. */
export const WHEEL_STEP = 0.05;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3.0;

/** Imperative zoom controls a PdfViewer hands to whoever asks for them. */
export interface ZoomApi {
  zoomIn(): void;
  zoomOut(): void;
  /** Back to fit-to-width. */
  reset(): void;
  set(scale: number): void;
}

export function clampZoom(scale: number): number {
  const bounded = Math.min(Math.max(scale, ZOOM_MIN), ZOOM_MAX);
  return Math.round(bounded * 100) / 100;
}

export function zoomIn(current: number): number {
  return clampZoom(current + ZOOM_STEP);
}

export function zoomOut(current: number): number {
  return clampZoom(current - ZOOM_STEP);
}

/**
 * Scale after one wheel event. Wheel-up (negative deltaY) zooms in, matching
 * every browser's own Ctrl+wheel; a zero delta leaves the scale alone.
 */
export function wheelZoom(current: number, deltaY: number): number {
  if (deltaY === 0) return clampZoom(current);
  return clampZoom(current + (deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP));
}

/** Label for the zoom readout. */
export function formatZoom(zoom: ZoomValue): string {
  return zoom === "auto" ? "Fit" : `${Math.round(zoom * 100)}%`;
}
