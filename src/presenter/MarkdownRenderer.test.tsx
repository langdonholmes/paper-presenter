import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders simple markdown text", () => {
    const { container } = render(<MarkdownRenderer content="Hello world" />);
    expect(container).toHaveTextContent("Hello world");
  });

  it("renders bold markdown", () => {
    const { container } = render(<MarkdownRenderer content="**bold text**" />);
    const strong = container.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent("bold text");
  });

  it("renders italic markdown", () => {
    const { container } = render(<MarkdownRenderer content="*italic text*" />);
    const em = container.querySelector("em");
    expect(em).toBeInTheDocument();
    expect(em).toHaveTextContent("italic text");
  });

  it("renders headings", () => {
    const { container } = render(<MarkdownRenderer content="# Heading 1" />);
    const h1 = container.querySelector("h1");
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent("Heading 1");
  });

  it("renders code blocks", () => {
    const { container } = render(<MarkdownRenderer content="```\ncode here\n```" />);
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("code here");
  });

  it("renders lists", () => {
    const { container } = render(
      <MarkdownRenderer content={"- item 1\n- item 2\n- item 3"} />,
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("applies className prop", () => {
    const { container } = render(
      <MarkdownRenderer content="test" className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass("custom-class");
  });

  it("renders without className", () => {
    const { container } = render(<MarkdownRenderer content="test" />);
    expect(container.firstElementChild).not.toHaveAttribute("class");
  });

  it("renders links", () => {
    const { container } = render(
      <MarkdownRenderer content="[click here](https://example.com)" />,
    );
    const link = container.querySelector("a");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveTextContent("click here");
  });

  it("renders inline code", () => {
    const { container } = render(<MarkdownRenderer content="`inline code`" />);
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("inline code");
  });
});
