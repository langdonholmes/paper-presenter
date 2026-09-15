import { useMemo } from "react";
import { renderMarkdown } from "../lib/markdown";
import "highlight.js/styles/nord.min.css";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: Props) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
