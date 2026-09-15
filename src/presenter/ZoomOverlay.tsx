import { useEffect, useRef, useState } from "react";
import { formatZoom, type ZoomValue } from "../lib/zoom";

/** How long the overlay stays fully visible after the zoom changes. */
export const ZOOM_OVERLAY_LINGER_MS = 1500;

interface Props {
  zoom: ZoomValue;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/**
 * Small zoom readout with buttons, parked in a corner of the presenter's PDF
 * pane. It sits nearly invisible so the projector shows the paper, brightens
 * while the pointer is over the pane (CSS), and shows itself for a moment
 * after any zoom change so keyboard and wheel zooms get a readout too.
 */
export default function ZoomOverlay({ zoom, onZoomIn, onZoomOut, onReset }: Props) {
  const [recent, setRecent] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRecent(true);
    const timer = setTimeout(() => setRecent(false), ZOOM_OVERLAY_LINGER_MS);
    return () => clearTimeout(timer);
  }, [zoom]);

  return (
    <div
      className={`zoom-overlay${recent ? " zoom-overlay--recent" : ""}`}
      role="group"
      aria-label="Zoom"
    >
      <button type="button" onClick={onZoomOut} title="Zoom out (Ctrl −)" aria-label="Zoom out">
        −
      </button>
      <button
        type="button"
        className="zoom-overlay-level"
        onClick={onReset}
        title="Fit to width (Ctrl 0)"
        aria-label="Reset zoom"
      >
        {formatZoom(zoom)}
      </button>
      <button type="button" onClick={onZoomIn} title="Zoom in (Ctrl +)" aria-label="Zoom in">
        +
      </button>
    </div>
  );
}
