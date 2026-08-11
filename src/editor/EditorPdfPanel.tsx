import { useRef, useCallback, useState } from "react";
import { v4 as uuid } from "uuid";
import PdfViewer from "../lib/PdfViewer";
import {
  snapPositionToWords,
  viewerCoveringPages,
  type SourceViewer,
} from "../lib/pdf-word-snap";
import { useProject } from "../state/ProjectContext";
import HighlightSelectionTip from "./HighlightSelectionTip";
import HighlightEditTip from "./HighlightEditTip";
import type {
  GhostHighlight,
  PdfHighlighterUtils,
} from "react-pdf-highlighter-extended";
import type { HighlightColor, PdfHighlight } from "../types";

export default function EditorPdfPanel() {
  const { pdfUrl, project, dispatch, selectedWaypointIndex } = useProject();
  const pendingGhost = useRef<GhostHighlight | null>(null);
  const highlighterUtils = useRef<PdfHighlighterUtils | null>(null);
  const [snapStatus, setSnapStatus] = useState<string | null>(null);

  const selectedWp = project.waypoints[selectedWaypointIndex] ?? null;
  const scrollToId = selectedWp?.highlightRef ?? null;

  const handleSelection = useCallback((ghost: GhostHighlight) => {
    pendingGhost.current = ghost;
  }, []);

  const handleAddHighlight = useCallback(
    (label: string, color: HighlightColor) => {
      const ghost = pendingGhost.current;
      if (!ghost) return;

      // Selection geometry lands a point or two off the glyphs, which shows up
      // as a clipped last letter or a crumb of the previous word.
      const viewer = highlighterUtils.current?.getViewer() as
        | SourceViewer
        | undefined;
      const position = viewer
        ? snapPositionToWords(ghost.position, viewer)
        : ghost.position;

      dispatch({
        type: "ADD_HIGHLIGHT",
        highlight: {
          id: uuid(),
          label,
          position,
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

  const handleUpdateHighlight = useCallback(
    (id: string, patch: Partial<Omit<PdfHighlight, "id">>) => {
      dispatch({ type: "UPDATE_HIGHLIGHT", id, patch });
    },
    [dispatch],
  );

  const handleDeleteHighlight = useCallback(
    (id: string) => {
      dispatch({ type: "DELETE_HIGHLIGHT", id });
      highlighterUtils.current?.setTip(null);
    },
    [dispatch],
  );

  /** Re-snaps every existing text highlight, including on pages not on screen. */
  const handleSnapAll = useCallback(async () => {
    const viewer = highlighterUtils.current?.getViewer() as
      | SourceViewer
      | undefined;
    if (!viewer) return;

    setSnapStatus("Snapping…");
    try {
      const textHighlights = project.highlights.filter(
        (highlight) => (highlight.position.rects?.length ?? 0) > 0,
      );
      const pages = [
        ...new Set(
          textHighlights.map(
            (highlight) => highlight.position.boundingRect.pageNumber ?? 1,
          ),
        ),
      ];
      const source = await viewerCoveringPages(pages, viewer);

      let adjusted = 0;
      for (const highlight of textHighlights) {
        const position = snapPositionToWords(highlight.position, source);
        if (position === highlight.position) continue;
        dispatch({ type: "UPDATE_HIGHLIGHT", id: highlight.id, patch: { position } });
        adjusted++;
      }
      setSnapStatus(
        `${adjusted} of ${textHighlights.length} adjusted`,
      );
    } catch {
      setSnapStatus("Snap failed");
    }
  }, [project.highlights, dispatch]);

  const renderHighlightTip = useCallback(
    (highlight: PdfHighlight) => (
      <HighlightEditTip
        highlight={highlight}
        onUpdate={handleUpdateHighlight}
        onDelete={handleDeleteHighlight}
      />
    ),
    [handleUpdateHighlight, handleDeleteHighlight],
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
    <>
      <button
        className="pdf-snap"
        onClick={handleSnapAll}
        title="Move every text highlight onto the nearest word boundaries"
      >
        {snapStatus ?? "Snap to words"}
      </button>
      <PdfViewer
        url={pdfUrl}
        highlights={project.highlights}
        scrollToHighlightId={scrollToId}
        scrollAlign={selectedWp?.scrollAlign ?? "center"}
        activeHighlightId={scrollToId}
        inactiveHighlights="dim"
        enableAreaSelection
        onSelection={handleSelection}
        selectionTip={<HighlightSelectionTip onAdd={handleAddHighlight} />}
        utilsRef={(utils) => {
          highlighterUtils.current = utils;
        }}
        highlightTip={renderHighlightTip}
      />
    </>
  );
}
