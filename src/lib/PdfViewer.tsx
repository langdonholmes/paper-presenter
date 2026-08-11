import { useRef, useCallback, useEffect, useMemo, type ReactNode } from "react";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  scaledPositionToViewport,
  useHighlightContainerContext,
  usePdfHighlighterContext,
  type PdfHighlighterUtils,
  type GhostHighlight,
} from "react-pdf-highlighter-extended";
import type { PdfHighlight, HighlightColor } from "../types";
import { HL_PALETTE } from "../types";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  centeringScrollOffset,
  highlightAlpha,
  visibleHighlights as selectVisibleHighlights,
  type InactiveHighlights,
} from "./highlight-view";

function highlightStyle(color: HighlightColor, alpha: number) {
  return { background: `rgba(${HL_PALETTE[color]}, ${alpha})` };
}

/**
 * The library parks a highlight's top just below the top of the viewport.
 * Nudge the scroll so the highlight sits in the middle of the page instead.
 */
function centerScrolledHighlight(
  utils: PdfHighlighterUtils,
  highlight: PdfHighlight,
) {
  const viewer = utils.getViewer();
  const container = viewer?.container;
  if (!container) return;

  const { boundingRect } = scaledPositionToViewport(highlight.position, viewer);
  container.scrollTop += centeringScrollOffset(
    boundingRect.height,
    container.clientHeight,
  );
}

export interface PdfViewerProps {
  url: string;
  highlights: PdfHighlight[];
  scrollToHighlightId?: string | null;
  /** The highlight belonging to the current waypoint. */
  activeHighlightId?: string | null;
  /**
   * What to do with every other highlight. "hide" is for presenting, where a
   * page of coloured boxes leaves the audience guessing which one the slide
   * means; "dim" is for authoring, where the others still need to be findable
   * and clickable.
   */
  inactiveHighlights?: InactiveHighlights;
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
  activeHighlightId = null,
  inactiveHighlights = "show",
  onSelection,
  selectionTip,
  enableAreaSelection = false,
  utilsRef: externalUtilsRef,
  highlightTip,
}: PdfViewerProps) {
  const internalUtilsRef = useRef<PdfHighlighterUtils | null>(null);
  // Kept unfiltered so scrolling still works when the target is hidden.
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;

  const visibleHighlights = useMemo(
    () => selectVisibleHighlights(highlights, activeHighlightId, inactiveHighlights),
    [highlights, inactiveHighlights, activeHighlightId],
  );

  function HighlightRenderer() {
    const { highlight, isScrolledTo } = useHighlightContainerContext();
    const { setTip } = usePdfHighlighterContext();
    const pdfHighlight = highlight as unknown as PdfHighlight;
    const color = pdfHighlight.color ?? "yellow";
    const isText = highlight.position.rects.length > 0;
    const alpha = highlightAlpha({
      isText,
      highlightId: pdfHighlight.id,
      activeId: activeHighlightId,
      mode: inactiveHighlights,
    });
    const style = {
      ...highlightStyle(color as HighlightColor, alpha),
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

    if (isText) {
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
    const utils = internalUtilsRef.current;
    if (!scrollToHighlightId || !utils) return;
    const hl = highlightsRef.current.find((h) => h.id === scrollToHighlightId);
    if (!hl) return;

    utils.scrollToHighlight(hl);
    try {
      centerScrolledHighlight(utils, hl);
    } catch {
      // Page not laid out yet — the library's top-anchored scroll still stands.
    }
  }, [scrollToHighlightId]);

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
          highlights={visibleHighlights}
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
