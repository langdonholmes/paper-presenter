import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ZoomOverlay, { ZOOM_OVERLAY_LINGER_MS } from "./ZoomOverlay";

const handlers = {
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onReset: vi.fn(),
};

describe("ZoomOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the zoom level and Fit for auto", () => {
    const { rerender } = render(<ZoomOverlay zoom="auto" {...handlers} />);
    expect(screen.getByText("Fit")).toBeInTheDocument();

    rerender(<ZoomOverlay zoom={1.5} {...handlers} />);
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("wires the three buttons", () => {
    render(<ZoomOverlay zoom={1} {...handlers} />);

    fireEvent.click(screen.getByLabelText("Zoom in"));
    fireEvent.click(screen.getByLabelText("Zoom out"));
    fireEvent.click(screen.getByLabelText("Reset zoom"));

    expect(handlers.onZoomIn).toHaveBeenCalledTimes(1);
    expect(handlers.onZoomOut).toHaveBeenCalledTimes(1);
    expect(handlers.onReset).toHaveBeenCalledTimes(1);
  });

  it("is quiet on mount, lingers after a zoom change, then fades", () => {
    const { rerender } = render(<ZoomOverlay zoom={1} {...handlers} />);
    const overlay = screen.getByRole("group", { name: "Zoom" });
    expect(overlay).not.toHaveClass("zoom-overlay--recent");

    rerender(<ZoomOverlay zoom={1.1} {...handlers} />);
    expect(overlay).toHaveClass("zoom-overlay--recent");

    act(() => {
      vi.advanceTimersByTime(ZOOM_OVERLAY_LINGER_MS);
    });
    expect(overlay).not.toHaveClass("zoom-overlay--recent");
  });

  it("restarts the linger on each change", () => {
    const { rerender } = render(<ZoomOverlay zoom={1} {...handlers} />);
    const overlay = screen.getByRole("group", { name: "Zoom" });

    rerender(<ZoomOverlay zoom={1.1} {...handlers} />);
    act(() => {
      vi.advanceTimersByTime(ZOOM_OVERLAY_LINGER_MS - 100);
    });
    rerender(<ZoomOverlay zoom={1.2} {...handlers} />);
    act(() => {
      vi.advanceTimersByTime(ZOOM_OVERLAY_LINGER_MS - 100);
    });
    expect(overlay).toHaveClass("zoom-overlay--recent");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(overlay).not.toHaveClass("zoom-overlay--recent");
  });
});
