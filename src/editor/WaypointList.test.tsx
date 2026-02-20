import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProject } from "../test-helpers";
import WaypointList from "./WaypointList";

vi.mock("./MilkdownEditor", () => ({
  default: () => <div data-testid="milkdown-editor" />,
}));

function getAddButton() {
  return screen.getByRole("button", { name: "+ Add" });
}

describe("WaypointList", () => {
  it("shows empty state message when no waypoints", () => {
    renderWithProject(<WaypointList />);
    expect(screen.getByText(/No waypoints yet/)).toBeInTheDocument();
    expect(getAddButton()).toBeInTheDocument();
  });

  it("does not show counter when no waypoints", () => {
    const { container } = renderWithProject(<WaypointList />);
    expect(container.querySelector(".wp-counter")).not.toBeInTheDocument();
  });

  it("adds a waypoint when + Add is clicked", async () => {
    const user = userEvent.setup();
    renderWithProject(<WaypointList />);
    await user.click(getAddButton());
    expect(screen.queryByText(/No waypoints yet/)).not.toBeInTheDocument();
    expect(screen.getByText("New Waypoint")).toBeInTheDocument();
  });

  it("shows counter after adding waypoints", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProject(<WaypointList />);
    await user.click(getAddButton());
    const counter = container.querySelector(".wp-counter");
    expect(counter).toBeInTheDocument();
    expect(counter?.textContent).toBe("1 / 1");
  });

  it("adds multiple waypoints", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProject(<WaypointList />);
    await user.click(getAddButton());
    await user.click(getAddButton());
    await user.click(getAddButton());
    const counter = container.querySelector(".wp-counter");
    expect(counter?.textContent).toBe("3 / 3");
  });

  it("deletes a waypoint", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProject(<WaypointList />);
    await user.click(getAddButton());
    await user.click(getAddButton());

    const deleteButtons = screen.getAllByTitle("Delete waypoint");
    expect(deleteButtons).toHaveLength(2);

    await user.click(deleteButtons[0]);
    expect(screen.getAllByTitle("Delete waypoint")).toHaveLength(1);
    expect(container.querySelector(".wp-counter")?.textContent).toBe("1 / 1");
  });

  it("selects a waypoint on click", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProject(<WaypointList />);
    await user.click(getAddButton());
    await user.click(getAddButton());

    const items = container.querySelectorAll(".waypoint-item");
    expect(items).toHaveLength(2);

    await user.click(items[0]);
    expect(items[0]).toHaveClass("selected");
  });

  it("renders Waypoints header", () => {
    renderWithProject(<WaypointList />);
    expect(screen.getByText("Waypoints")).toBeInTheDocument();
  });

  it("decrements index when deleting before selected (middle) waypoint", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProject(<WaypointList />);
    // Add 3 waypoints → selected auto-advances to last
    await user.click(getAddButton());
    await user.click(getAddButton());
    await user.click(getAddButton());
    // Select the 2nd waypoint (index 1) — NOT at the end
    const items = container.querySelectorAll(".waypoint-item");
    await user.click(items[1]);
    expect(container.querySelector(".wp-counter")?.textContent).toBe("2 / 3");
    // Delete the 1st waypoint (index 0), which is before selected (index 1)
    // This triggers the `index < selectedWaypointIndex` branch
    const deleteButtons = screen.getAllByTitle("Delete waypoint");
    await user.click(deleteButtons[0]);
    // Selected should decrement from 2 to 1
    expect(container.querySelector(".wp-counter")?.textContent).toBe("1 / 2");
  });

  it("clamps index when deleting the last waypoint while selected", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProject(<WaypointList />);
    await user.click(getAddButton());
    await user.click(getAddButton());
    // Selected is already the last (index 1)
    expect(container.querySelector(".wp-counter")?.textContent).toBe("2 / 2");
    // Delete the last waypoint — triggers `selectedWaypointIndex >= length - 1`
    const deleteButtons = screen.getAllByTitle("Delete waypoint");
    await user.click(deleteButtons[1]);
    expect(container.querySelector(".wp-counter")?.textContent).toBe("1 / 1");
  });
});
