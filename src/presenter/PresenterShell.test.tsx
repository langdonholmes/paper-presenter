import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { listen } from "@tauri-apps/api/event";
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
    // getCurrentWindow returns the same mock object each call (from test-setup)
    const mockWindow = getCurrentWindow();
    await act(async () => {
      render(<PresenterShell />);
    });
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
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
});
