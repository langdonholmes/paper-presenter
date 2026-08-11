import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import type { Waypoint } from "../types";

const hoisted = vi.hoisted(() => ({
  state: {
    project: { waypoints: [] as Waypoint[] },
    selectedWaypointIndex: 0,
  },
}));

vi.mock("../state/ProjectContext", () => ({
  useProject: () => hoisted.state,
}));

import PresenterConsole from "./PresenterConsole";

function waypoint(over: Partial<Waypoint>): Waypoint {
  return {
    id: "w",
    title: "Title",
    content: "",
    notes: "",
    page: 1,
    scrollY: null,
    highlightRef: null,
    color: null,
    sidebarWidth: "35%",
    sidebar: true,
    ...over,
  };
}

const DECK: Waypoint[] = [
  waypoint({ id: "w1", title: "Opening", notes: "~2 min. Set it up." }),
  waypoint({ id: "w2", title: "The headline", notes: "~30 sec. Let it land." }),
  waypoint({ id: "w3", title: "Discussion", notes: "" }),
];

function setState(waypoints: Waypoint[], index: number) {
  hoisted.state.project = { waypoints };
  hoisted.state.selectedWaypointIndex = index;
}

const onHide = vi.fn();

describe("PresenterConsole", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setState(DECK, 0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows position, title, notes and the planned budget", () => {
    render(<PresenterConsole onHide={onHide} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("Opening")).toBeInTheDocument();
    expect(screen.getByText("~2 min. Set it up.")).toBeInTheDocument();
    expect(screen.getByText("planned 2 min")).toBeInTheDocument();
  });

  it("shows the next waypoint title", () => {
    render(<PresenterConsole onHide={onHide} />);
    expect(screen.getByText("The headline")).toBeInTheDocument();
  });

  it("shows the deck total from the notes", () => {
    render(<PresenterConsole onHide={onHide} />);
    // 2 min + 30 sec + nothing = 2.5, rounded for display
    expect(screen.getByText("plan ~3 min")).toBeInTheDocument();
  });

  it("counts up once started", () => {
    render(<PresenterConsole onHide={onHide} />);
    expect(screen.getByText("00:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("00:03")).toBeInTheDocument();
  });

  it("pauses and resumes the clock", () => {
    render(<PresenterConsole onHide={onHide} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("00:02")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:03")).toBeInTheDocument();
  });

  it("resets the clock and restarts it", () => {
    render(<PresenterConsole onHide={onHide} />);

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("00:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:01")).toBeInTheDocument();
  });

  it("starts on plan and flips to over once it runs long", () => {
    render(<PresenterConsole onHide={onHide} />);
    expect(screen.getByText("on plan")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300_000); // 5 minutes in, nothing was due yet
    });
    expect(screen.getByText("5 min over")).toBeInTheDocument();
  });

  it("falls back when a waypoint has no notes", () => {
    setState(DECK, 2);
    render(<PresenterConsole onHide={onHide} />);

    expect(
      screen.getByText("No speaker notes for this waypoint."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^planned /)).not.toBeInTheDocument();
    expect(screen.getByText("End of deck")).toBeInTheDocument();
  });

  it("handles an empty deck", () => {
    setState([], 0);
    render(<PresenterConsole onHide={onHide} />);

    expect(screen.getByText("No waypoint")).toBeInTheDocument();
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
    expect(screen.getByText("End of deck")).toBeInTheDocument();
  });

  it("calls onHide from the Hide button", () => {
    render(<PresenterConsole onHide={onHide} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
