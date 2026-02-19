import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders a progress bar container", () => {
    const { container } = render(<ProgressBar current={0} total={5} />);
    expect(container.querySelector(".presenter-progress")).toBeInTheDocument();
  });

  it("calculates correct width for first waypoint (1/5 = 20%)", () => {
    const { container } = render(<ProgressBar current={0} total={5} />);
    const fill = container.querySelector(".presenter-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("20%");
  });

  it("calculates correct width for middle waypoint (3/5 = 60%)", () => {
    const { container } = render(<ProgressBar current={2} total={5} />);
    const fill = container.querySelector(".presenter-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("60%");
  });

  it("calculates 100% for last waypoint", () => {
    const { container } = render(<ProgressBar current={4} total={5} />);
    const fill = container.querySelector(".presenter-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("handles total=0 with 0% width", () => {
    const { container } = render(<ProgressBar current={0} total={0} />);
    const fill = container.querySelector(".presenter-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("handles single waypoint (100%)", () => {
    const { container } = render(<ProgressBar current={0} total={1} />);
    const fill = container.querySelector(".presenter-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});
