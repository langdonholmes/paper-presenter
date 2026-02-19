import { describe, it, expect, vi } from "vitest";
import { render, within } from "@testing-library/react";
import PresenterSidebar from "./PresenterSidebar";
import { createEmptyWaypoint } from "../state/project-reducer";

vi.mock("./MarkdownRenderer", () => ({
  default: ({ content, className }: { content: string; className?: string }) => (
    <div className={className} data-testid="markdown-renderer">
      {content}
    </div>
  ),
}));

describe("PresenterSidebar", () => {
  it("renders waypoint title", () => {
    const wp = createEmptyWaypoint({ title: "Key Finding" });
    const { container } = render(<PresenterSidebar waypoint={wp} width="40%" />);
    const sidebar = within(container.querySelector(".presenter-sidebar") as HTMLElement);
    expect(sidebar.getByText("Key Finding")).toBeInTheDocument();
  });

  it("renders markdown content when present", () => {
    const wp = createEmptyWaypoint({ title: "Test", content: "Some **markdown**" });
    const { container } = render(<PresenterSidebar waypoint={wp} width="35%" />);
    expect(container.querySelector("[data-testid='markdown-renderer']")).toBeInTheDocument();
  });

  it("does not render MarkdownRenderer when content is empty", () => {
    const wp = createEmptyWaypoint({ title: "Empty", content: "" });
    const { container } = render(<PresenterSidebar waypoint={wp} width="35%" />);
    expect(container.querySelector("[data-testid='markdown-renderer']")).not.toBeInTheDocument();
  });

  it("applies width style to aside", () => {
    const wp = createEmptyWaypoint({ title: "Test" });
    const { container } = render(<PresenterSidebar waypoint={wp} width="50%" />);
    const aside = container.querySelector("aside") as HTMLElement;
    expect(aside.style.width).toBe("50%");
    expect(aside.style.minWidth).toBe("50%");
    expect(aside.style.maxWidth).toBe("50%");
  });

  it("has presenter-sidebar class", () => {
    const wp = createEmptyWaypoint({ title: "Test" });
    const { container } = render(<PresenterSidebar waypoint={wp} width="35%" />);
    expect(container.querySelector(".presenter-sidebar")).toBeInTheDocument();
  });

  it("title is rendered as h2", () => {
    const wp = createEmptyWaypoint({ title: "Heading Test" });
    const { container } = render(<PresenterSidebar waypoint={wp} width="35%" />);
    const sidebar = container.querySelector(".presenter-sidebar") as HTMLElement;
    const heading = within(sidebar).getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Heading Test");
  });
});
