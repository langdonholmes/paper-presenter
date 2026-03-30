import { useRef, useCallback } from "react";
import { v4 as uuid } from "uuid";
import PdfViewer from "../lib/PdfViewer";
import { useProject } from "../state/ProjectContext";
import HighlightSelectionTip from "./HighlightSelectionTip";
import type {
  GhostHighlight,
  PdfHighlighterUtils,
} from "react-pdf-highlighter-extended";
import type { HighlightColor } from "../types";

export default function EditorPdfPanel() {
  const { pdfUrl, project, dispatch, selectedWaypointIndex } = useProject();
  const pendingGhost = useRef<GhostHighlight | null>(null);
  const highlighterUtils = useRef<PdfHighlighterUtils | null>(null);

  const selectedWp = project.waypoints[selectedWaypointIndex] ?? null;
  const scrollToId = selectedWp?.highlightRef ?? null;

  const handleSelection = useCallback((ghost: GhostHighlight) => {
    pendingGhost.current = ghost;
  }, []);

  const handleAddHighlight = useCallback(
    (label: string, color: HighlightColor) => {
      const ghost = pendingGhost.current;
      if (!ghost) return;

      dispatch({
        type: "ADD_HIGHLIGHT",
        highlight: {
          id: uuid(),
          label,
          position: ghost.position,
          content: ghost.content,
          color,
        },
      });
      pendingGhost.current = null;
      highlighterUtils.current?.removeGhostHighlight();
      highlighterUtils.current?.setTip(null);
    },
    [dispatch],
  );

  if (!pdfUrl) {
    return (
      <div className="pdf-placeholder">
        <span className="pdf-placeholder-text">No PDF loaded</span>
        <span className="pdf-placeholder-hint">
          Click <strong>PDF</strong> in the toolbar to select a file
        </span>
      </div>
    );
  }

  return (
    <PdfViewer
      url={pdfUrl}
      highlights={project.highlights}
      scrollToHighlightId={scrollToId}
      enableAreaSelection
      onSelection={handleSelection}
      selectionTip={<HighlightSelectionTip onAdd={handleAddHighlight} />}
      utilsRef={(utils) => {
        highlighterUtils.current = utils;
      }}
    />
  );
}
