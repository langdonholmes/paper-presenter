import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emitTo } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { renderWithProject } from "../test-helpers";
import { useProject } from "../state/ProjectContext";
import EditorToolbar from "./EditorToolbar";

vi.mock("./MilkdownEditor", () => ({
  default: () => <div data-testid="milkdown-editor" />,
}));

/** Reads project.meta.title from context so tests can verify state propagation. */
function StateReader() {
  const { project } = useProject();
  return <span data-testid="state-title">{project.meta.title}</span>;
}

function renderToolbar() {
  const result = renderWithProject(
    <>
      <EditorToolbar />
      <StateReader />
    </>,
  );
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

  it("committing title on blur updates project state", async () => {
    const user = userEvent.setup();
    const { toolbar } = renderToolbar();
    const input = toolbar.querySelector(".title-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "My Paper");
    await user.tab();
    const { getByTestId } = within(toolbar.parentElement!);
    expect(getByTestId("state-title").textContent).toBe("My Paper");
  });

  describe("handlePresent", () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
    afterEach(() => { vi.useRealTimers(); });

    it("handles null presenter window gracefully", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      vi.mocked(WebviewWindow.getByLabel).mockResolvedValueOnce(null);
      const { queries } = renderToolbar();
      // Should not throw when getByLabel returns null
      await user.click(queries.getByText("Present"));
      await vi.advanceTimersByTimeAsync(150);
      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith("presenter");
    });

    it("shows presenter window and emits project-updated", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { queries } = renderToolbar();
      const mockWin = await WebviewWindow.getByLabel("presenter");
      const mockEmitTo = vi.mocked(emitTo);
      mockEmitTo.mockClear();

      await user.click(queries.getByText("Present"));
      // Advance past the 100ms setTimeout inside handlePresent
      await vi.advanceTimersByTimeAsync(150);

      expect(WebviewWindow.getByLabel).toHaveBeenCalledWith("presenter");
      expect(mockWin!.show).toHaveBeenCalled();
      expect(mockWin!.setFocus).toHaveBeenCalled();
      expect(mockEmitTo).toHaveBeenCalledWith(
        "presenter",
        "project-updated",
        expect.anything(),
      );
    });
  });
});
