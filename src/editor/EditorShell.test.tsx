import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { mockDialog } from "../test-helpers";

// Mock heavy child components with lightweight stubs
vi.mock("./EditorToolbar", () => ({
  default: () => <div data-testid="toolbar">Toolbar</div>,
}));
vi.mock("./WaypointList", () => ({
  default: () => <div data-testid="waypoint-list">WaypointList</div>,
}));
vi.mock("./WaypointEditor", () => ({
  default: () => <div data-testid="waypoint-editor">WaypointEditor</div>,
}));
vi.mock("./EditorPdfPanel", () => ({
  default: () => <div data-testid="pdf-panel">PdfPanel</div>,
}));

import EditorShell from "./EditorShell";

describe("EditorShell", () => {
  it("renders all panels", () => {
    render(<EditorShell />);
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("waypoint-list")).toBeInTheDocument();
    expect(screen.getByTestId("waypoint-editor")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-panel")).toBeInTheDocument();
  });

  it("Cmd+S triggers save dialog (no filePath)", async () => {
    mockDialog.save.mockResolvedValueOnce(null);
    render(<EditorShell />);
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", metaKey: true }),
      );
    });
    expect(mockDialog.save).toHaveBeenCalled();
  });

  it("Cmd+Shift+S triggers save-as dialog", async () => {
    mockDialog.save.mockResolvedValueOnce(null);
    render(<EditorShell />);
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", metaKey: true, shiftKey: true }),
      );
    });
    // doSaveAs always calls save() with null filePath
    expect(mockDialog.save).toHaveBeenCalled();
  });

  it("Cmd+N triggers new (no dialog when not dirty)", async () => {
    render(<EditorShell />);
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "n", metaKey: true }),
      );
    });
    // Not dirty, so no ask dialog
    expect(mockDialog.ask).not.toHaveBeenCalled();
  });

  it("Cmd+O triggers open dialog", async () => {
    mockDialog.open.mockResolvedValueOnce(null);
    render(<EditorShell />);
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "o", metaKey: true }),
      );
    });
    expect(mockDialog.open).toHaveBeenCalled();
  });
});
