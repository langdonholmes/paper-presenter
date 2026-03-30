import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { listen, emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ProjectFile, Waypoint } from "../types";

// Mock child components
vi.mock("./PresenterPdfView", () => ({
  default: ({ pdfUrl }: { pdfUrl: string }) => (
    <div data-testid="pdf-view">{pdfUrl}</div>
  ),
}));
vi.mock("./PresenterSidebar", () => ({
  default: ({ waypoint }: { waypoint: Waypoint }) => (
    <div data-testid="sidebar">{waypoint.title}</div>
  ),
}));
vi.mock("./ProgressBar", () => ({
  default: ({ current, total }: { current: number; total: number }) => (
    <div data-testid="progress">{current}/{total}</div>
  ),
}));

import PresenterShell from "./PresenterShell";

const mockListen = vi.mocked(listen);

const testWaypoint: Waypoint = {
  id: "w1",
  title: "Intro",
  content: "Hello",
  notes: "",
  page: 1,
  scrollY: null,
  highlightRef: "h1",
  color: null,
  sidebarWidth: "35%",
  sidebar: true,
  scrollAlign: "center",
};

const testProject: ProjectFile = {
  version: 1,
  meta: { title: "Test", defaults: { sidebarWidth: "35%", sidebar: true } },
  pdfPath: "test.pdf",
  highlights: [],
  waypoints: [testWaypoint],
};

// Capture event handlers registered via listen()
type EventHandler = (event: { payload: unknown }) => void;
let eventHandlers: Map<string, EventHandler>;

beforeEach(() => {
  eventHandlers = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockListen.mockImplementation(async (event: any, handler: any) => {
    eventHandlers.set(event as string, handler as EventHandler);
    return () => { eventHandlers.delete(event as string); };
  });
});

describe("PresenterShell", () => {
  it("shows waiting state before receiving events", async () => {
    await act(async () => {
      render(<PresenterShell />);
    });
    expect(screen.getByText("Waiting for project data...")).toBeInTheDocument();
  });

  it("renders content after project-updated event", async () => {
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      eventHandlers.get("project-updated")?.({
        payload: { project: testProject, pdfUrl: "asset://test.pdf" },
      });
    });
    expect(screen.getByTestId("pdf-view")).toBeInTheDocument();
    expect(screen.getByTestId("progress")).toBeInTheDocument();
  });

  it("updates index on navigate-to-waypoint event", async () => {
    await act(async () => {
      render(<PresenterShell />);
    });
    // Send project first
    await act(async () => {
      eventHandlers.get("project-updated")?.({
        payload: { project: testProject, pdfUrl: "asset://test.pdf" },
      });
    });
    await act(async () => {
      eventHandlers.get("navigate-to-waypoint")?.({
        payload: { index: 0, waypoint: testWaypoint },
      });
    });
    expect(screen.getByTestId("progress").textContent).toBe("0/1");
  });

  it("patches waypoint on waypoint-changed event", async () => {
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      eventHandlers.get("project-updated")?.({
        payload: { project: testProject, pdfUrl: "asset://test.pdf" },
      });
    });
    // Patch the waypoint title
    const updated = { ...testWaypoint, title: "Updated" };
    await act(async () => {
      eventHandlers.get("waypoint-changed")?.({
        payload: { index: 0, waypoint: updated },
      });
    });
    expect(screen.getByTestId("sidebar").textContent).toBe("Updated");
  });

  it("hides window on Escape key", async () => {
    const mockWindow = getCurrentWindow();
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(mockWindow.hide).toHaveBeenCalled();
  });

  it("intercepts close request to hide instead of destroy", async () => {
    const mockWindow = getCurrentWindow();
    const mockOnClose = vi.mocked(mockWindow.onCloseRequested);
    // Capture the handler passed to onCloseRequested
    let closeHandler: (event: { preventDefault: () => void }) => void = () => {};
    mockOnClose.mockImplementation(async (handler: unknown) => {
      closeHandler = handler as typeof closeHandler;
      return () => {};
    });

    await act(async () => {
      render(<PresenterShell />);
    });

    expect(mockOnClose).toHaveBeenCalled();

    // Simulate the OS close button
    const preventDefaultSpy = vi.fn();
    closeHandler({ preventDefault: preventDefaultSpy });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockWindow.hide).toHaveBeenCalled();
  });

  it("calls unlisten on unmount", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<PresenterShell />);
    });
    // Listeners should be registered
    expect(eventHandlers.size).toBeGreaterThan(0);
    await act(async () => {
      result!.unmount();
    });
    // All handlers should be cleaned up
    expect(eventHandlers.size).toBe(0);
  });

  it("handles unmount after first listen resolves but before second", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let callCount = 0;
    let pendingResolvers: Array<(value: () => void) => void> = [];

    mockListen.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First listen resolves immediately
        return () => {};
      }
      // Subsequent listens are deferred
      return new Promise<() => void>((resolve) => {
        pendingResolvers.push(resolve);
      });
    });

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<PresenterShell />);
    });

    // Unmount while second listen is pending
    await act(async () => {
      result!.unmount();
    });

    // Resolve pending promises — unmount guards should prevent state updates
    await act(async () => {
      for (const resolve of pendingResolvers) {
        resolve(() => {});
      }
    });

    expect(console.error).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles unmount after second listen resolves but before third", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let callCount = 0;
    let pendingResolvers: Array<(value: () => void) => void> = [];

    mockListen.mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return () => {};
      }
      return new Promise<() => void>((resolve) => {
        pendingResolvers.push(resolve);
      });
    });

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<PresenterShell />);
    });

    await act(async () => {
      result!.unmount();
    });

    await act(async () => {
      for (const resolve of pendingResolvers) {
        resolve(() => {});
      }
    });

    expect(console.error).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles emitPresenterState rejection gracefully", async () => {
    const mockEmitTo = vi.mocked(emitTo);
    // Make emitTo reject — the .catch(() => {}) in emitPresenterState should absorb it
    mockEmitTo.mockRejectedValueOnce(new Error("window not found"));
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      eventHandlers.get("project-updated")?.({
        payload: { project: testProject, pdfUrl: "asset://test.pdf" },
      });
    });
    // Should not throw — the catch absorbs the error
    expect(screen.getByTestId("pdf-view")).toBeInTheDocument();
  });

  it("hides sidebar when waypoint has sidebar=false", async () => {
    const noSidebarWaypoint: Waypoint = {
      ...testWaypoint,
      sidebar: false,
    };
    const projectNoSidebar: ProjectFile = {
      ...testProject,
      waypoints: [noSidebarWaypoint],
    };
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      eventHandlers.get("project-updated")?.({
        payload: { project: projectNoSidebar, pdfUrl: "asset://test.pdf" },
      });
    });
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("arrow keys advance the displayed waypoint", async () => {
    const secondWaypoint: Waypoint = {
      ...testWaypoint,
      id: "w2",
      title: "Methods",
    };
    const multiProject: ProjectFile = {
      ...testProject,
      waypoints: [testWaypoint, secondWaypoint],
    };
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      eventHandlers.get("project-updated")?.({
        payload: { project: multiProject, pdfUrl: "asset://test.pdf" },
      });
    });
    // Initially on first waypoint
    expect(screen.getByTestId("sidebar").textContent).toBe("Intro");
    expect(screen.getByTestId("progress").textContent).toBe("0/2");

    // ArrowRight advances to second waypoint
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(screen.getByTestId("sidebar").textContent).toBe("Methods");
    expect(screen.getByTestId("progress").textContent).toBe("1/2");

    // ArrowLeft goes back to first
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });
    expect(screen.getByTestId("sidebar").textContent).toBe("Intro");
    expect(screen.getByTestId("progress").textContent).toBe("0/2");
  });

  it("ignores waypoint-changed when project is null", async () => {
    await act(async () => {
      render(<PresenterShell />);
    });
    // Don't send project-updated, so project stays null
    await act(async () => {
      eventHandlers.get("waypoint-changed")?.({
        payload: { index: 0, waypoint: testWaypoint },
      });
    });
    // Should still show waiting state
    expect(screen.getByText("Waiting for project data...")).toBeInTheDocument();
  });
});
