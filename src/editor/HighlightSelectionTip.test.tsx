import { describe, it, expect, vi } from "vitest";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HighlightSelectionTip from "./HighlightSelectionTip";
import { HL_PALETTE } from "../types";

function renderTip(onAdd = vi.fn()) {
  const result = render(<HighlightSelectionTip onAdd={onAdd} />);
  const tip = result.container.querySelector(".hl-tip") as HTMLElement;
  return { ...result, tip, queries: within(tip), onAdd };
}

describe("HighlightSelectionTip", () => {
  it("renders label input, color swatches, and add button", () => {
    const { tip } = renderTip();
    expect(tip.querySelector(".hl-tip-input")).toBeInTheDocument();
    expect(tip.querySelector(".hl-tip-add")).toBeInTheDocument();
    const swatches = tip.querySelectorAll(".hl-tip-swatch");
    expect(swatches).toHaveLength(Object.keys(HL_PALETTE).length);
  });

  it("add button is disabled when label is empty", () => {
    const { tip } = renderTip();
    const btn = tip.querySelector(".hl-tip-add") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("add button becomes enabled when label has content", async () => {
    const user = userEvent.setup();
    const { tip } = renderTip();
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    await user.type(input, "Test");
    const btn = tip.querySelector(".hl-tip-add") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls onAdd with label and default color on button click", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    const { tip } = renderTip(onAdd);
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    await user.type(input, "Definition");
    await user.click(tip.querySelector(".hl-tip-add") as HTMLElement);
    expect(onAdd).toHaveBeenCalledWith("Definition", "yellow");
  });

  it("calls onAdd on Enter key in label input", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    const { tip } = renderTip(onAdd);
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    await user.type(input, "Key point{Enter}");
    expect(onAdd).toHaveBeenCalledWith("Key point", "yellow");
  });

  it("does not call onAdd on Enter when label is empty", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    const { tip } = renderTip(onAdd);
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    await user.type(input, "{Enter}");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("changes selected color when swatch is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    const { tip } = renderTip(onAdd);

    const blueSwatch = tip.querySelector('[title="blue"]') as HTMLElement;
    const yellowSwatch = tip.querySelector('[title="yellow"]') as HTMLElement;
    await user.click(blueSwatch);
    expect(blueSwatch).toHaveClass("active");
    expect(yellowSwatch).not.toHaveClass("active");

    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    await user.type(input, "Test");
    await user.click(tip.querySelector(".hl-tip-add") as HTMLElement);
    expect(onAdd).toHaveBeenCalledWith("Test", "blue");
  });

  it("trims whitespace from label", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    const { tip } = renderTip(onAdd);
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    await user.type(input, "  spaced  ");
    await user.click(tip.querySelector(".hl-tip-add") as HTMLElement);
    expect(onAdd).toHaveBeenCalledWith("spaced", "yellow");
  });

  it("label input has autoFocus", () => {
    const { tip } = renderTip();
    const input = tip.querySelector(".hl-tip-input") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  });

  it("renders all palette colors as swatches with correct backgrounds", () => {
    const { tip } = renderTip();
    for (const colorName of Object.keys(HL_PALETTE)) {
      const swatch = tip.querySelector(`[title="${colorName}"]`) as HTMLElement;
      expect(swatch).toBeInTheDocument();
      expect(swatch.style.background).toContain(HL_PALETTE[colorName as keyof typeof HL_PALETTE]);
    }
  });
});
