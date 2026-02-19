import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("../lib/PdfViewer", () => ({
  default: (props: {
    onSelection?: (g: unknown) => void;
    selectionTip?: ReactNode;
  }) => {
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

vi.mock("../state/ProjectContext", () => ({
  useProject: () => ({
    pdfUrl: mockPdfUrl,
    project: {
      version: 1,
      meta: { title: "T", defaults: { sidebarWidth: "35%", sidebar: true } },
      pdfPath: "",
      highlights: [],
      waypoints: [],
    },
    dispatch: mockDispatch,
    selectedWaypointIndex: 0,
  }),
}));

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
});
