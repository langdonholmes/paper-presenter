import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  scaledPositionToViewport,
  useHighlightContainerContext,
  usePdfHighlighterContext,
  type PdfHighlighterUtils,
  type PdfScaleValue,
  type GhostHighlight,
} from "react-pdf-highlighter-extended";
import type { PdfHighlight, HighlightColor, ScrollAlign } from "../types";
import { HL_PALETTE } from "../types";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  alignScrollOffset,
  darken,
  highlightAlpha,
  highlightBorderAlpha,
  highlightOutlined,
  type InactiveHighlights,
} from "./highlight-view";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

function highlightStyle(color: HighlightColor, fill: number, border: number) {
  const rgb = HL_PALETTE[color];
  return {
    background: `rgba(${rgb}, ${fill})`,
    ...(border > 0
      ? { border: `1px solid rgba(${darken(rgb)}, ${border})` }
      : {}),
  };
}

/**
 * The library parks a highlight's top just below the top of the viewport.
 * Nudge the scroll so the highlight sits where the waypoint asked for instead.
 */
function alignScrolledHighlight(
  utils: PdfHighlighterUtils,
  highlight: PdfHighlight,
  align: ScrollAlign,
) {
  const viewer = utils.getViewer();
  const container = viewer?.container;
  if (!container) return;

  const { boundingRect } = scaledPositionToViewport(highlight.position, viewer);
  container.scrollTop += alignScrollOffset(
    align,
    boundingRect.height,
    container.clientHeight,
  );
}

export interface PdfViewerProps {
  url: string;
  highlights: PdfHighlight[];
  scrollToHighlightId?: string | null;
  /** Where in the viewport the scrolled-to highlight should come to rest. */
  scrollAlign?: ScrollAlign;
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
  scrollAlign = "center",
}: PdfViewerProps) {
  const internalUtilsRef = useRef<PdfHighlighterUtils | null>(null);
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;
  const scaleRef = useRef<PdfScaleValue>("auto");
  const [pdfScale, setPdfScale] = useState<PdfScaleValue>("auto");

  // Re-apply our scale after the library's ResizeObserver resets it.
  // Observers fire in registration order, so ours (registered after mount)
  // always runs after the library's.
  useEffect(() => {
    const viewer = internalUtilsRef.current?.getViewer();
    if (!viewer) return;
    const ro = new ResizeObserver(() => {
      if (scaleRef.current === "auto") return;
      const target = Number(scaleRef.current);
      if (Math.abs(viewer.currentScale - target) > 0.01) {
        viewer.currentScaleValue = scaleRef.current.toString();
      }
    });
    ro.observe(viewer.container);
    return () => ro.disconnect();
  }, [pdfScale]); // re-register after viewer is ready (pdfScale change implies viewer exists)

  // Zoom with Cmd/Ctrl +/- and Cmd/Ctrl 0 to reset
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const viewer = internalUtilsRef.current?.getViewer();
      if (!viewer) return;

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const current =
          typeof scaleRef.current === "number"
            ? scaleRef.current
            : viewer.currentScale;
        const next = Math.round(Math.min(current + ZOOM_STEP, ZOOM_MAX) * 100) / 100;
        scaleRef.current = next;
        setPdfScale(next);
      } else if (e.key === "-") {
        e.preventDefault();
        const current =
          typeof scaleRef.current === "number"
            ? scaleRef.current
            : viewer.currentScale;
        const next = Math.round(Math.max(current - ZOOM_STEP, ZOOM_MIN) * 100) / 100;
        scaleRef.current = next;
        setPdfScale(next);
      } else if (e.key === "0") {
        e.preventDefault();
        scaleRef.current = "auto";
        setPdfScale("auto");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /**
   * Which waypoint's highlight is current, read at paint time rather than
   * captured when the layer was rendered.
   *
   * PdfHighlighter repaints its highlight layers imperatively, and some of the
   * triggers fire from closures built on earlier renders — most notably the
   * one-shot scroll listener it arms after every scrollToHighlight, which it
   * never manages to remove because each render creates a fresh handler
   * function. A repaint from one of those closures would otherwise restore a
   * previous waypoint's focus, which is what made highlights come and go while
   * moving through the deck.
   */
  const focusRef = useRef({ activeHighlightId, inactiveHighlights });
  focusRef.current = { activeHighlightId, inactiveHighlights };

  /**
   * PdfHighlighter repaints when the identity of `highlights` changes, and
   * nothing else it watches changes when the waypoint does — so the focus has
   * to be part of that identity or moving between waypoints would not repaint
   * at all. The contents and their order stay exactly the same, which is what
   * keeps the viewer's per-page index keying stable.
   */
  const focusedHighlights = useMemo(
    () => highlights.slice(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus drives identity
    [highlights, activeHighlightId, inactiveHighlights],
  );

  function HighlightRenderer() {
    const { highlight } = useHighlightContainerContext();
    const { setTip } = usePdfHighlighterContext();
    const pdfHighlight = highlight as unknown as PdfHighlight;
    const color = pdfHighlight.color ?? "yellow";
    const isText = highlight.position.rects.length > 0;
    const paint = {
      isText,
      highlightId: pdfHighlight.id,
      activeId: focusRef.current.activeHighlightId,
      mode: focusRef.current.inactiveHighlights,
    };
    const isActive = highlightOutlined(paint);
    const style = {
      ...highlightStyle(
        color as HighlightColor,
        highlightAlpha(paint),
        highlightBorderAlpha(paint),
      ),
      ...(isActive ? { outline: "2px solid var(--accent, #89b4fa)" } : {}),
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
          isScrolledTo={isActive}
          style={style}
          onClick={handleClick}
        />
      );
    }
    return (
      <AreaHighlight
        highlight={highlight}
        isScrolledTo={isActive}
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
      alignScrolledHighlight(utils, hl, scrollAlign);
    } catch {
      // Page not laid out yet — the library's top-anchored scroll still stands.
    }
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
          highlights={focusedHighlights}
          pdfScaleValue={pdfScale}
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
