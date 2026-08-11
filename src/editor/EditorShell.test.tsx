import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { mockDialog, mockFs } from "../test-helpers";

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

const mockEmitTo = vi.mocked(emitTo);

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

  it("Ctrl+S triggers save (ctrlKey variant)", async () => {
    mockDialog.save.mockResolvedValueOnce(null);
    render(<EditorShell />);
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", ctrlKey: true }),
      );
    });
    expect(mockDialog.save).toHaveBeenCalled();
  });

  describe("presenter console", () => {
    /** Fires the handler EditorShell registered for `presenter-state`. */
    async function emitPresenterState(payload: {
      currentIndex: number;
      total: number;
      isPresenting: boolean;
    }) {
      const call = vi
        .mocked(listen)
        .mock.calls.find(([event]) => event === "presenter-state");
      expect(call).toBeDefined();
      const handler = call![1] as (e: { payload: unknown }) => void;
      await act(async () => {
        handler({ payload });
      });
    }

    it("stays hidden until the presenter reports in", async () => {
      await act(async () => {
        render(<EditorShell />);
      });
      expect(screen.queryByLabelText("Presenter console")).not.toBeInTheDocument();
    });

    it("appears when the presenter starts, and hides on request", async () => {
      await act(async () => {
        render(<EditorShell />);
      });

      await emitPresenterState({ currentIndex: 0, total: 1, isPresenting: true });
      expect(screen.getByLabelText("Presenter console")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Hide" }));
      expect(screen.queryByLabelText("Presenter console")).not.toBeInTheDocument();
    });
  });

  describe("debounced emitters", () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it("emits project-updated to presenter after debounce", async () => {
      await act(async () => {
        render(<EditorShell />);
      });
      mockEmitTo.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      expect(mockEmitTo).toHaveBeenCalledWith(
        "presenter",
        "project-updated",
        expect.anything(),
      );
    });

    it("emits navigate-to-waypoint after opening project with waypoints", async () => {
      const projectWithWaypoints = {
        version: 1,
        meta: { title: "Test", defaults: { sidebarWidth: "35%", sidebar: true } },
        pdfPath: "",
        highlights: [],
        waypoints: [{ id: "w1", title: "W1", content: "", notes: "", page: 1, scrollY: null, highlightRef: null, color: null, sidebarWidth: "35%", sidebar: true, scrollAlign: "center" }],
      };
      mockDialog.open.mockResolvedValueOnce("/test.paperp.json");
      mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(projectWithWaypoints));

      await act(async () => {
        render(<EditorShell />);
      });
      // Clear before triggering — navigate effect fires inside act
      mockEmitTo.mockClear();
      // Open a project with waypoints via Cmd+O
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "o", metaKey: true }),
        );
      });
      // Also advance the debounced project-updated timer
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      const navCalls = mockEmitTo.mock.calls.filter(
        ([, event]) => event === "navigate-to-waypoint",
      );
      expect(navCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
