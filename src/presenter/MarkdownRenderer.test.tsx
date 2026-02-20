import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("applies syntax highlighting for known languages", () => {
    const { container } = render(
      <MarkdownRenderer content={'```python\nprint("hello")\n```'} />,
    );
    const code = container.querySelector("code.hljs.language-python");
    expect(code).toBeInTheDocument();
    expect(code!.querySelector("span")).toBeInTheDocument();
  });

  it("falls back to plain code for unknown languages", () => {
    const { container } = render(
      <MarkdownRenderer content={'```unknownlang\nfoo bar\n```'} />,
    );
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("foo bar");
  });
});
