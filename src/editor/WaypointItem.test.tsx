import { describe, it, expect, vi } from "vitest";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import WaypointItem from "./WaypointItem";
import type { Waypoint } from "../types";
import { createEmptyWaypoint } from "../state/project-reducer";

function renderWaypointItem(props: {
  waypoint?: Waypoint;
  index?: number;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}) {
  const wp = props.waypoint ?? createEmptyWaypoint({ title: "Test WP" });
  const result = render(
    <DndContext>
      <SortableContext items={[wp.id]} strategy={verticalListSortingStrategy}>
        <WaypointItem
          waypoint={wp}
          index={props.index ?? 0}
          selected={props.selected ?? false}
          onSelect={props.onSelect ?? vi.fn()}
          onDelete={props.onDelete ?? vi.fn()}
        />
      </SortableContext>
    </DndContext>,
  );
  // Scope queries to the waypoint item container
  const item = result.container.querySelector(".waypoint-item") as HTMLElement;
  return { ...result, item, queries: within(item) };
}

describe("WaypointItem", () => {
  it("renders the waypoint title", () => {
    const { queries } = renderWaypointItem({ waypoint: createEmptyWaypoint({ title: "Introduction" }) });
    expect(queries.getByText("Introduction")).toBeInTheDocument();
  });

  it("shows 'Untitled' when title is empty", () => {
    const { queries } = renderWaypointItem({ waypoint: createEmptyWaypoint({ title: "" }) });
    expect(queries.getByText("Untitled")).toBeInTheDocument();
  });

  it("displays 1-based index", () => {
    const { queries } = renderWaypointItem({ index: 2 });
    expect(queries.getByText("3")).toBeInTheDocument();
  });

  it("applies selected class when selected", () => {
    const { item } = renderWaypointItem({ selected: true });
    expect(item).toHaveClass("selected");
  });

  it("does not apply selected class when not selected", () => {
    const { item } = renderWaypointItem({ selected: false });
    expect(item).not.toHaveClass("selected");
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { queries } = renderWaypointItem({ onSelect });
    await user.click(queries.getByText("Test WP"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { queries } = renderWaypointItem({ onDelete, onSelect });
    await user.click(queries.getByTitle("Delete waypoint"));
    expect(onDelete).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders drag handle", () => {
    const { item } = renderWaypointItem({});
    const handle = item.querySelector(".drag-handle");
    expect(handle).toBeInTheDocument();
  });

  it("shows color dot when waypoint has a color", () => {
    const wp = createEmptyWaypoint({ color: "blue" });
    const { item } = renderWaypointItem({ waypoint: wp });
    expect(item.querySelector(".wp-color-dot")).toBeInTheDocument();
  });

  it("does not show color dot when waypoint has no color", () => {
    const wp = createEmptyWaypoint({ color: null });
    const { item } = renderWaypointItem({ waypoint: wp });
    expect(item.querySelector(".wp-color-dot")).not.toBeInTheDocument();
  });
});
