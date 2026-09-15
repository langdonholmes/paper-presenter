import { describe, it, expect } from "vitest";
import {
  clampZoom,
  formatZoom,
  wheelZoom,
  zoomIn,
  zoomOut,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  WHEEL_STEP,
} from "./zoom";

describe("clampZoom", () => {
  it("keeps values inside the allowed range", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(10)).toBe(ZOOM_MAX);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it("rounds away floating point drift", () => {
    expect(clampZoom(1.1 + 0.1)).toBe(1.2);
  });
});

describe("zoomIn / zoomOut", () => {
  it("step by ZOOM_STEP", () => {
    expect(zoomIn(1)).toBeCloseTo(1 + ZOOM_STEP);
    expect(zoomOut(1)).toBeCloseTo(1 - ZOOM_STEP);
  });

  it("stop at the bounds", () => {
    expect(zoomIn(ZOOM_MAX)).toBe(ZOOM_MAX);
    expect(zoomOut(ZOOM_MIN)).toBe(ZOOM_MIN);
  });
});

describe("wheelZoom", () => {
  it("zooms in on wheel-up and out on wheel-down", () => {
    expect(wheelZoom(1, -100)).toBeCloseTo(1 + WHEEL_STEP);
    expect(wheelZoom(1, 100)).toBeCloseTo(1 - WHEEL_STEP);
  });

  it("ignores the size of the delta, only its direction", () => {
    expect(wheelZoom(1, -3)).toBe(wheelZoom(1, -300));
  });

  it("leaves the scale alone on a zero delta", () => {
    expect(wheelZoom(1.3, 0)).toBe(1.3);
  });

  it("respects the bounds", () => {
    expect(wheelZoom(ZOOM_MAX, -1)).toBe(ZOOM_MAX);
    expect(wheelZoom(ZOOM_MIN, 1)).toBe(ZOOM_MIN);
  });
});

describe("formatZoom", () => {
  it("labels fit-to-width", () => {
    expect(formatZoom("auto")).toBe("Fit");
  });

  it("shows a whole percentage", () => {
    expect(formatZoom(1)).toBe("100%");
    expect(formatZoom(1.25)).toBe("125%");
    expect(formatZoom(0.666)).toBe("67%");
  });
});
