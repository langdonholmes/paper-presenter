import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProject } from "../test-helpers";
import WaypointList from "./WaypointList";
import WaypointEditor from "./WaypointEditor";

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
    expect(screen.getByPlaceholderText("Speaker notes (not shown in presenter)")).toBeInTheDocument();
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
    const textarea = screen.getByPlaceholderText("Speaker notes (not shown in presenter)") as HTMLTextAreaElement;
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
});
