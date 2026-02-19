import { describe, it, expect, vi } from "vitest";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProject } from "../test-helpers";
import EditorToolbar from "./EditorToolbar";

vi.mock("./MilkdownEditor", () => ({
  default: () => <div data-testid="milkdown-editor" />,
}));

function renderToolbar() {
  const result = renderWithProject(<EditorToolbar />);
  const toolbar = result.container.querySelector(".editor-toolbar") as HTMLElement;
  return { ...result, toolbar, queries: within(toolbar) };
}

describe("EditorToolbar", () => {
  it("renders all toolbar buttons", () => {
    const { queries } = renderToolbar();
    expect(queries.getByText("New")).toBeInTheDocument();
    expect(queries.getByText("Open")).toBeInTheDocument();
    expect(queries.getByText("Save")).toBeInTheDocument();
    expect(queries.getByText("Save As")).toBeInTheDocument();
    expect(queries.getByText("PDF")).toBeInTheDocument();
    expect(queries.getByText("Present")).toBeInTheDocument();
  });

  it("renders title input with default 'Untitled' value", () => {
    const { toolbar } = renderToolbar();
    const input = toolbar.querySelector(".title-input") as HTMLInputElement;
    expect(input.value).toBe("Untitled");
  });

  it("does not show dirty dot initially", () => {
    const { toolbar } = renderToolbar();
    expect(toolbar.querySelector(".dirty-dot")).not.toBeInTheDocument();
  });

  it("buttons have correct tooltip titles", () => {
    const { queries } = renderToolbar();
    expect(queries.getByTitle("New project (Ctrl+N)")).toBeInTheDocument();
    expect(queries.getByTitle("Open project (Ctrl+O)")).toBeInTheDocument();
    expect(queries.getByTitle("Save project (Ctrl+S)")).toBeInTheDocument();
    expect(queries.getByTitle("Save As (Ctrl+Shift+S)")).toBeInTheDocument();
  });

  it("title input updates on user typing", async () => {
    const user = userEvent.setup();
    const { toolbar } = renderToolbar();
    const input = toolbar.querySelector(".title-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "My Paper");
    expect(input.value).toBe("My Paper");
  });

  it("commits title on blur", async () => {
    const user = userEvent.setup();
    const { toolbar } = renderToolbar();
    const input = toolbar.querySelector(".title-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "New Title");
    await user.tab();
    expect(input.value).toBe("New Title");
  });

  it("commits title on Enter key", async () => {
    const user = userEvent.setup();
    const { toolbar } = renderToolbar();
    const input = toolbar.querySelector(".title-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Enter Title{Enter}");
    expect(input.value).toBe("Enter Title");
  });

  it("reverts title on blur if empty", async () => {
    const user = userEvent.setup();
    const { toolbar } = renderToolbar();
    const input = toolbar.querySelector(".title-input") as HTMLInputElement;
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe("Untitled");
  });

  it("Present button has primary class", () => {
    const { queries } = renderToolbar();
    expect(queries.getByText("Present")).toHaveClass("primary");
  });
});
