import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HighlightEditTip from "./HighlightEditTip";
import { HL_PALETTE, type PdfHighlight } from "../types";

const HIGHLIGHT: PdfHighlight = {
  id: "hl-7",
  label: "Forking tokens",
  position: {
    boundingRect: {
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
      width: 612,
      height: 792,
      pageNumber: 3,
    },
    rects: [],
    usePdfCoordinates: true,
  },
  content: {},
  color: "purple",
};

function renderTip() {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const result = render(
    <HighlightEditTip
      highlight={HIGHLIGHT}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />,
  );
  const tip = result.container.querySelector(".hl-tip") as HTMLElement;
  return { ...result, tip, onUpdate, onDelete };
}

describe("HighlightEditTip", () => {
  it("seeds the input with the existing label and focuses it", () => {
    const { tip } = renderTip();
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    expect(input.value).toBe("Forking tokens");
    expect(document.activeElement).toBe(input);
  });

  it("renders one swatch per palette colour", () => {
    const { tip } = renderTip();
    expect(tip.querySelectorAll(".hl-tip-swatch")).toHaveLength(
      Object.keys(HL_PALETTE).length,
    );
  });

  it("marks the highlight's current colour active and no other", () => {
    const { tip } = renderTip();
    expect(tip.querySelector('[title="purple"]')).toHaveClass("active");
    expect(tip.querySelector('[title="yellow"]')).not.toHaveClass("active");
  });

  it("pushes each label keystroke through onUpdate", async () => {
    const user = userEvent.setup();
    const { tip, onUpdate } = renderTip();
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;

    await user.type(input, "!");

    expect(input.value).toBe("Forking tokens!");
    expect(onUpdate).toHaveBeenLastCalledWith("hl-7", {
      label: "Forking tokens!",
    });
  });

  it("updates the colour when a swatch is clicked", async () => {
    const user = userEvent.setup();
    const { tip, onUpdate } = renderTip();

    await user.click(tip.querySelector('[title="teal"]') as HTMLElement);

    expect(onUpdate).toHaveBeenCalledWith("hl-7", { color: "teal" });
  });

  it("calls onDelete with the highlight id", async () => {
    const user = userEvent.setup();
    const { tip, onDelete } = renderTip();

    await user.click(tip.querySelector(".hl-tip-delete") as HTMLElement);

    expect(onDelete).toHaveBeenCalledWith("hl-7");
  });
});
