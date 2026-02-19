import { useRef, useCallback, useEffect } from "react";
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  AreaHighlight,
  useHighlightContainerContext,
  type PdfHighlighterUtils,
  type GhostHighlight,
} from "react-pdf-highlighter-extended";
import type { PdfHighlight, HighlightColor } from "../types";
import { HL_PALETTE } from "../types";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

function highlightStyle(color: HighlightColor) {
  return { background: `rgba(${HL_PALETTE[color]}, 0.35)` };
}

function HighlightRenderer() {
  const { highlight, isScrolledTo } = useHighlightContainerContext();
  const color = (highlight as unknown as PdfHighlight).color ?? "yellow";
  const style = {
    ...highlightStyle(color as HighlightColor),
    ...(isScrolledTo ? { outline: "2px solid var(--accent, #89b4fa)" } : {}),
  };

  if (highlight.position.rects.length > 0) {
    return (
      <TextHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        style={style}
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

export interface PdfViewerProps {
  url: string;
  highlights: PdfHighlight[];
  scrollToHighlightId?: string | null;
  onSelection?: (ghost: GhostHighlight) => void;
  selectionTip?: React.ReactNode;
  enableAreaSelection?: boolean;
  utilsRef?: (utils: PdfHighlighterUtils) => void;
}

export default function PdfViewer({
  url,
  highlights,
  scrollToHighlightId,
  onSelection,
  selectionTip,
  enableAreaSelection = false,
  utilsRef: externalUtilsRef,
}: PdfViewerProps) {
  const internalUtilsRef = useRef<PdfHighlighterUtils | null>(null);

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
    const hl = highlights.find((h) => h.id === scrollToHighlightId);
    if (hl) {
      internalUtilsRef.current.scrollToHighlight(hl);
    }
  }, [scrollToHighlightId, highlights]);

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
