import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";

// The real snapping needs a live pdf.js canvas, which jsdom cannot provide.
const snap = vi.hoisted(() => ({
  snapPositionToWords: vi.fn((position: unknown) => position),
  viewerCoveringPages: vi.fn(async () => ({ getPageView: () => undefined })),
}));
vi.mock("../lib/pdf-word-snap", () => snap);

/** Set to null to simulate the viewer not being ready yet. */
let mockViewer: unknown = { getPageView: () => undefined };

vi.mock("../lib/PdfViewer", () => ({
  default: (props: {
    onSelection?: (g: unknown) => void;
    selectionTip?: ReactNode;
    utilsRef?: (utils: unknown) => void;
  }) => {
    props.utilsRef?.({
      getViewer: () => mockViewer,
      removeGhostHighlight: () => {},
      setTip: () => {},
    });
    return (
      <div data-testid="pdf-viewer">
        <button
          data-testid="trigger-selection"
          onClick={() => props.onSelection?.({
            type: "ghost",
            position: { boundingRect: { x1: 0, y1: 0, x2: 100, y2: 100, width: 100, height: 100, pageNumber: 1 }, rects: [], pageNumber: 1 },
            content: { text: "selected text" },
          })}
        >
          Select
        </button>
        {props.selectionTip}
      </div>
    );
  },
}));

vi.mock("./HighlightSelectionTip", () => ({
  default: ({ onAdd }: { onAdd: (label: string, color: string) => void }) => (
    <button data-testid="add-highlight" onClick={() => onAdd("Test Label", "yellow")}>
      Add
    </button>
  ),
}));

// Mock useProject with controllable values
const mockDispatch = vi.fn();
let mockPdfUrl: string | null = null;
let mockHighlights: unknown[] = [];

vi.mock("../state/ProjectContext", () => ({
  useProject: () => ({
    pdfUrl: mockPdfUrl,
    project: {
      version: 1,
      meta: { title: "T", defaults: { sidebarWidth: "35%", sidebar: true } },
      pdfPath: "",
      highlights: mockHighlights,
      waypoints: [],
    },
    dispatch: mockDispatch,
    selectedWaypointIndex: 0,
  }),
}));

function textHighlight(id: string) {
  return {
    id,
    label: id,
    position: {
      boundingRect: { x1: 0, y1: 0, x2: 10, y2: 10, width: 612, height: 792, pageNumber: 3 },
      rects: [{ x1: 0, y1: 0, x2: 10, y2: 10, width: 612, height: 792, pageNumber: 3 }],
      usePdfCoordinates: true,
    },
    content: { text: id },
    color: "yellow",
  };
}

function areaHighlight(id: string) {
  const highlight = textHighlight(id);
  return { ...highlight, position: { ...highlight.position, rects: [] } };
}

import EditorPdfPanel from "./EditorPdfPanel";

describe("EditorPdfPanel", () => {
  it("renders placeholder when no PDF is loaded", () => {
    mockPdfUrl = null;
    render(<EditorPdfPanel />);
    expect(screen.getByText("No PDF loaded")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-viewer")).not.toBeInTheDocument();
  });

  it("renders PdfViewer when pdfUrl is set", () => {
    mockPdfUrl = "asset://localhost/test.pdf";
    render(<EditorPdfPanel />);
    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
  });

  it("dispatches ADD_HIGHLIGHT after selection + add", async () => {
    mockPdfUrl = "asset://localhost/test.pdf";
    render(<EditorPdfPanel />);

    // Trigger selection then add
    await act(async () => {
      screen.getByTestId("trigger-selection").click();
    });
    await act(async () => {
      screen.getByTestId("add-highlight").click();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADD_HIGHLIGHT",
        highlight: expect.objectContaining({
          label: "Test Label",
          color: "yellow",
          content: { text: "selected text" },
        }),
      }),
    );
  });

  it("does not dispatch when adding without prior selection", async () => {
    mockPdfUrl = "asset://localhost/test.pdf";
    render(<EditorPdfPanel />);

    // Add without selection first
    await act(async () => {
      screen.getByTestId("add-highlight").click();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  describe("snap to words", () => {
    beforeEach(() => {
      mockPdfUrl = "asset://localhost/test.pdf";
      mockHighlights = [];
      mockViewer = { getPageView: () => undefined };
      snap.snapPositionToWords.mockImplementation((position: unknown) => position);
      snap.viewerCoveringPages.mockResolvedValue({ getPageView: () => undefined });
    });

    async function clickSnap() {
      await act(async () => {
        screen.getByRole("button", { name: /Snap to words|adjusted/ }).click();
      });
    }

    it("updates the highlights that moved and counts them", async () => {
      mockHighlights = [textHighlight("a"), textHighlight("b")];
      // Only the first one shifts.
      snap.snapPositionToWords.mockImplementation((position: unknown) =>
        (position as { rects: unknown[] }) === (mockHighlights[0] as { position: unknown }).position
          ? { ...(position as object) }
          : position,
      );

      render(<EditorPdfPanel />);
      await clickSnap();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "UPDATE_HIGHLIGHT", id: "a" }),
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(screen.getByText("1 of 2 adjusted")).toBeInTheDocument();
    });

    it("skips area highlights, which have no words to snap to", async () => {
      mockHighlights = [areaHighlight("fig")];
      render(<EditorPdfPanel />);
      await clickSnap();

      expect(snap.snapPositionToWords).not.toHaveBeenCalled();
      expect(screen.getByText("0 of 0 adjusted")).toBeInTheDocument();
    });

    it("reports when nothing needed moving", async () => {
      mockHighlights = [textHighlight("a")];
      render(<EditorPdfPanel />);
      await clickSnap();

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(screen.getByText("0 of 1 adjusted")).toBeInTheDocument();
    });

    it("does nothing while the viewer is not ready", async () => {
      mockViewer = null;
      mockHighlights = [textHighlight("a")];
      render(<EditorPdfPanel />);
      await clickSnap();

      expect(snap.viewerCoveringPages).not.toHaveBeenCalled();
      expect(screen.getByText("Snap to words")).toBeInTheDocument();
    });

    it("surfaces a failure rather than throwing", async () => {
      mockHighlights = [textHighlight("a")];
      snap.viewerCoveringPages.mockRejectedValue(new Error("render died"));
      render(<EditorPdfPanel />);
      await clickSnap();

      expect(screen.getByText("Snap failed")).toBeInTheDocument();
    });
  });
});
