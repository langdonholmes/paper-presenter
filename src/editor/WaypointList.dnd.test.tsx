import { describe, it, expect, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Waypoint } from "../types";
import { renderWithProject } from "../test-helpers";

/**
 * Drag-and-drop reordering, exercised by capturing the onDragEnd handler that
 * WaypointList hands to DndContext. Driving a real pointer drag needs layout
 * measurements jsdom does not provide.
 */

const captured = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd: (event: DragEndEvent) => void;
    }) => {
      captured.onDragEnd = onDragEnd;
      return <>{children}</>;
    },
  };
});

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/sortable")>();
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

vi.mock("./WaypointItem", () => ({
  default: ({ waypoint }: { waypoint: Waypoint }) => (
    <div data-testid="wp-item" data-id={waypoint.id} />
  ),
}));

import WaypointList from "./WaypointList";

function ids() {
  return screen.getAllByTestId("wp-item").map((el) => el.dataset.id);
}

function counter(container: HTMLElement) {
  return container.querySelector(".wp-counter")?.textContent;
}

async function renderWithThreeWaypoints() {
  const user = userEvent.setup();
  const result = renderWithProject(<WaypointList />);
  const add = screen.getByRole("button", { name: "+ Add" });
  await user.click(add);
  await user.click(add);
  await user.click(add);
  return result;
}

function drag(activeId: string | undefined, overId: string | null) {
  act(() => {
    captured.onDragEnd?.({
      active: { id: activeId },
      over: overId === null ? null : { id: overId },
    } as unknown as DragEndEvent);
  });
}

describe("WaypointList drag and drop", () => {
  it("moves the dragged waypoint and follows it with the selection", async () => {
    const { container } = await renderWithThreeWaypoints();
    const [a, b, c] = ids();

    drag(a, c!);

    expect(ids()).toEqual([b, c, a]);
    expect(counter(container)).toBe("3 / 3");
  });

  it("ignores a drag that ends outside any target", async () => {
    await renderWithThreeWaypoints();
    const before = ids();

    drag(before[0], null);

    expect(ids()).toEqual(before);
  });

  it("ignores a drag that ends where it started", async () => {
    await renderWithThreeWaypoints();
    const before = ids();

    drag(before[1], before[1]!);

    expect(ids()).toEqual(before);
  });

  it("ignores a drag referencing an unknown waypoint", async () => {
    await renderWithThreeWaypoints();
    const before = ids();

    drag(before[0], "no-such-waypoint");
    drag("no-such-waypoint", before[0]!);

    expect(ids()).toEqual(before);
  });
});
