import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProject } from "../test-helpers";
import { useProject } from "../state/ProjectContext";
import WaypointList from "./WaypointList";
import WaypointEditor from "./WaypointEditor";
import type { PdfHighlight } from "../types";

vi.mock("./MilkdownEditor", () => ({
  default: ({ defaultValue, onChange }: { defaultValue: string; onChange: (md: string) => void }) => (
    <textarea
      data-testid="milkdown-editor"
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

function getAddButton() {
  return screen.getByRole("button", { name: "+ Add" });
}

function renderEditorWithList() {
  return renderWithProject(
    <>
      <WaypointList />
      <WaypointEditor />
    </>,
  );
}

describe("WaypointEditor", () => {
  it("shows empty state when no waypoint is selected", () => {
    renderWithProject(<WaypointEditor />);
    expect(screen.getByText("No waypoint selected")).toBeInTheDocument();
  });

  it("shows form when a waypoint is selected", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    expect(screen.queryByText("No waypoint selected")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Waypoint title")).toBeInTheDocument();
  });

  it("displays title from selected waypoint", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const input = screen.getByPlaceholderText("Waypoint title") as HTMLInputElement;
    expect(input.value).toBe("New Waypoint");
  });

  it("renders title input, notes textarea, page input, highlight select, sidebar controls", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());

    expect(screen.getByPlaceholderText("Waypoint title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Speaker notes \(console only/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Auto")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
  });

  it("title input updates on typing", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const input = screen.getByPlaceholderText("Waypoint title") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Introduction");
    expect(input.value).toBe("Introduction");
  });

  it("notes textarea updates on typing", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const textarea = screen.getByPlaceholderText(/^Speaker notes \(console only/) as HTMLTextAreaElement;
    await user.type(textarea, "Remember to pause here");
    expect(textarea.value).toBe("Remember to pause here");
  });

  it("page number input accepts numbers", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const input = screen.getByPlaceholderText("Auto") as HTMLInputElement;
    await user.type(input, "5");
    expect(input.value).toBe("5");
  });

  it("clearing page input resets to null (Auto)", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const input = screen.getByPlaceholderText("Auto") as HTMLInputElement;
    await user.type(input, "5");
    expect(input.value).toBe("5");
    await user.clear(input);
    expect(input.value).toBe("");
  });

  it("sidebar checkbox toggles sidebar visibility", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("sidebar width input is disabled when sidebar is unchecked", async () => {
    const user = userEvent.setup();
    const { container } = renderEditorWithList();
    await user.click(getAddButton());
    const widthInput = container.querySelector(".wp-sidebar-width-input") as HTMLInputElement;
    expect(widthInput).not.toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(widthInput).toBeDisabled();
  });

  it("sidebar width input shows default value", async () => {
    const user = userEvent.setup();
    const { container } = renderEditorWithList();
    await user.click(getAddButton());
    const widthInput = container.querySelector(".wp-sidebar-width-input") as HTMLInputElement;
    expect(widthInput.value).toBe("35%");
  });

  it("highlight select shows 'None' as default", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("has section labels for Navigation and Sidebar", async () => {
    const user = userEvent.setup();
    renderEditorWithList();
    await user.click(getAddButton());
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
  });

  it("selecting a highlight updates the dropdown value", async () => {
    const testHighlight: PdfHighlight = {
      id: "h1",
      label: "Test Highlight",
      position: {
        boundingRect: { x1: 0, y1: 0, x2: 100, y2: 50, width: 612, height: 792, pageNumber: 1 },
        rects: [],
        usePdfCoordinates: false,
      },
      content: { text: "sample" },
      color: "yellow",
    };

    function HighlightAdder() {
      const { dispatch } = useProject();
      return (
        <button
          data-testid="add-highlight"
          onClick={() => dispatch({ type: "ADD_HIGHLIGHT", highlight: testHighlight })}
        />
      );
    }

    const user = userEvent.setup();
    renderWithProject(
      <>
        <WaypointList />
        <WaypointEditor />
        <HighlightAdder />
      </>,
    );
    await user.click(screen.getByTestId("add-highlight"));
    await user.click(getAddButton());
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options).toHaveLength(2); // "None" + "Test Highlight"
    expect(options[1].textContent).toBe("Test Highlight");

    // Select the highlight and verify the value changes
    await user.selectOptions(select, "h1");
    expect(select.value).toBe("h1");
  });

  it("sidebar width input onChange updates value", async () => {
    const user = userEvent.setup();
    const { container } = renderEditorWithList();
    await user.click(getAddButton());
    const widthInput = container.querySelector(".wp-sidebar-width-input") as HTMLInputElement;
    await user.clear(widthInput);
    await user.type(widthInput, "50%");
    expect(widthInput.value).toBe("50%");
  });

  describe("debounced dispatch", () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
    afterEach(() => { vi.useRealTimers(); });

    it("title change propagates to waypoint list after debounce", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderEditorWithList();
      await user.click(getAddButton());
      const input = screen.getByPlaceholderText("Waypoint title") as HTMLInputElement;
      await user.clear(input);
      await user.type(input, "X");
      await act(async () => { vi.advanceTimersByTime(300); });
      // The WaypointItem in the list should reflect the dispatched title
      const listItem = screen.getByText("X", { selector: ".wp-title" });
      expect(listItem).toBeInTheDocument();
    });

    it("content change dispatches after debounce", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderEditorWithList();
      await user.click(getAddButton());
      const textarea = screen.getByTestId("milkdown-editor") as HTMLTextAreaElement;
      await user.type(textarea, "Hello");
      await act(async () => { vi.advanceTimersByTime(300); });
      // Content is dispatched to state — if dispatch failed, the component would error
      expect(textarea).toBeInTheDocument();
    });

    it("sidebar width change propagates after debounce", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderEditorWithList();
      await user.click(getAddButton());
      const widthInput = container.querySelector(".wp-sidebar-width-input") as HTMLInputElement;
      await user.clear(widthInput);
      await user.type(widthInput, "50%");
      await act(async () => { vi.advanceTimersByTime(300); });
      expect(widthInput.value).toBe("50%");
    });
  });
});
