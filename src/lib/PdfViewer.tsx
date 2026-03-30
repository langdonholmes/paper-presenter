import { useRef, useCallback, useEffect, type ReactNode } from "react";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  useHighlightContainerContext,
  usePdfHighlighterContext,
  type PdfHighlighterUtils,
  type GhostHighlight,
} from "react-pdf-highlighter-extended";
import type { PdfHighlight, HighlightColor } from "../types";
import { HL_PALETTE } from "../types";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function highlightStyle(color: HighlightColor) {
  return { background: `rgba(${HL_PALETTE[color]}, 0.35)` };
}

export interface PdfViewerProps {
  url: string;
  highlights: PdfHighlight[];
  scrollToHighlightId?: string | null;
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
}: PdfViewerProps) {
  const internalUtilsRef = useRef<PdfHighlighterUtils | null>(null);
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;

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
    if (hl) {
      internalUtilsRef.current.scrollToHighlight(hl);
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
