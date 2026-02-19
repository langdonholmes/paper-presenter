import { useRef, useCallback } from "react";
import { v4 as uuid } from "uuid";
import PdfViewer from "../lib/PdfViewer";
import { useProject } from "../state/ProjectContext";
import HighlightSelectionTip from "./HighlightSelectionTip";
import type { GhostHighlight } from "react-pdf-highlighter-extended";
import type { HighlightColor } from "../types";

export default function EditorPdfPanel() {
  const { pdfUrl, project, dispatch, selectedWaypointIndex } = useProject();
  const pendingGhost = useRef<GhostHighlight | null>(null);

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
    },
    [dispatch],
  );

  if (!pdfUrl) {
    return <div className="pdf-placeholder">Select a PDF to get started</div>;
  }

  return (
    <PdfViewer
      url={pdfUrl}
      highlights={project.highlights}
      scrollToHighlightId={scrollToId}
      enableAreaSelection
      onSelection={handleSelection}
      selectionTip={<HighlightSelectionTip onAdd={handleAddHighlight} />}
    />
  );
}
