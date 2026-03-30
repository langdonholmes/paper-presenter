import { useRef, useCallback, useEffect, type ReactNode } from "react";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  useHighlightContainerContext,
  usePdfHighlighterContext,
  scaledPositionToViewport,
  type PdfHighlighterUtils,
  type GhostHighlight,
} from "react-pdf-highlighter-extended";
import type { PdfHighlight, HighlightColor, ScrollAlign } from "../types";
import { HL_PALETTE } from "../types";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function highlightStyle(color: HighlightColor) {
  return { background: `rgba(${HL_PALETTE[color]}, 0.35)` };
}

export interface PdfViewerProps {
  url: string;
  highlights: PdfHighlight[];
  scrollToHighlightId?: string | null;
  scrollAlign?: ScrollAlign;
  onSelection?: (ghost: GhostHighlight) => void;
  selectionTip?: React.ReactNode;
  enableAreaSelection?: boolean;
  utilsRef?: (utils: PdfHighlighterUtils) => void;
  highlightTip?: (highlight: PdfHighlight) => ReactNode;
}

export default function PdfViewer({
  url,
  highlights,
  scrollToHighlightId,
  onSelection,
  selectionTip,
  enableAreaSelection = false,
  utilsRef: externalUtilsRef,
  highlightTip,
  scrollAlign = "center",
}: PdfViewerProps) {
  const internalUtilsRef = useRef<PdfHighlighterUtils | null>(null);
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;

  // Zoom with Cmd/Ctrl +/- and Cmd/Ctrl 0 to reset
  useEffect(() => {
    const ZOOM_STEP = 0.1;
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 3.0;

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const viewer = internalUtilsRef.current?.getViewer();
      if (!viewer) return;

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        viewer.currentScale = Math.min(viewer.currentScale + ZOOM_STEP, ZOOM_MAX);
      } else if (e.key === "-") {
        e.preventDefault();
        viewer.currentScale = Math.max(viewer.currentScale - ZOOM_STEP, ZOOM_MIN);
      } else if (e.key === "0") {
        e.preventDefault();
        viewer.currentScaleValue = "auto";
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function HighlightRenderer() {
    const { highlight, isScrolledTo } = useHighlightContainerContext();
    const { setTip } = usePdfHighlighterContext();
    const pdfHighlight = highlight as unknown as PdfHighlight;
    const color = pdfHighlight.color ?? "yellow";
    const style = {
      ...highlightStyle(color as HighlightColor),
      ...(isScrolledTo ? { outline: "2px solid var(--accent, #89b4fa)" } : {}),
    };

    const handleClick = highlightTip
      ? () => {
          setTip({
            position: highlight.position,
            content: highlightTip(pdfHighlight),
          });
        }
      : undefined;

    if (highlight.position.rects.length > 0) {
      return (
        <TextHighlight
          highlight={highlight}
          isScrolledTo={isScrolledTo}
          style={style}
          onClick={handleClick}
        />
      );
    }
    return (
      <AreaHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        style={style}
      />
    );
  }

  const handleUtilsRef = useCallback(
    (utils: PdfHighlighterUtils) => {
      internalUtilsRef.current = utils;
      externalUtilsRef?.(utils);
    },
    [externalUtilsRef],
  );

  // Scroll to highlight when scrollToHighlightId changes
  useEffect(() => {
    if (!scrollToHighlightId || !internalUtilsRef.current) return;
    const hl = highlightsRef.current.find((h) => h.id === scrollToHighlightId);
    if (!hl) return;

    const viewer = internalUtilsRef.current.getViewer();
    if (!viewer) return;

    const { boundingRect } = scaledPositionToViewport(hl.position, viewer);
    const container = viewer.container;
    const pageView = viewer.getPageView(boundingRect.pageNumber - 1);
    if (!pageView) return;

    // Absolute top of the highlight within the scrollable container
    const highlightTop = pageView.div.offsetTop + boundingRect.top;
    const highlightHeight = boundingRect.height;
    const containerHeight = container.clientHeight;

    let scrollTarget: number;
    switch (scrollAlign) {
      case "top":
        scrollTarget = highlightTop - 10;
        break;
      case "bottom":
        scrollTarget = highlightTop + highlightHeight - containerHeight + 10;
        break;
      case "center":
      default:
        scrollTarget =
          highlightTop + highlightHeight / 2 - containerHeight / 2;
        break;
    }

    container.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
  }, [scrollToHighlightId, scrollAlign]);

  return (
    <PdfLoader
      document={url}
      workerSrc={workerSrc}
      errorMessage={(error) => (
        <div style={{ padding: 24, color: "var(--ctp-red, #f38ba8)" }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load PDF</p>
          <p style={{ fontSize: 13, color: "var(--subtext, #a6adc8)" }}>
            {error.message}
          </p>
        </div>
      )}
    >
      {(pdfDocument) => (
        <PdfHighlighter
          pdfDocument={pdfDocument}
          highlights={highlights}
          enableAreaSelection={
            enableAreaSelection ? (e: MouseEvent) => e.altKey : undefined
          }
          selectionTip={selectionTip}
          onSelection={
            onSelection
              ? (selection) => onSelection(selection.makeGhostHighlight())
              : undefined
          }
          utilsRef={handleUtilsRef}
        >
          <HighlightRenderer />
        </PdfHighlighter>
      )}
    </PdfLoader>
  );
}
