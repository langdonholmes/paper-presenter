import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import latex from "highlight.js/lib/languages/latex";

hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("latex", latex);

/**
 * The one markdown pipeline. The presenter renders through it live and the
 * HTML export renders through it offline, so a deck cannot look one way on
 * screen and another way in the backup.
 */
export const marked = new Marked(
  markedKatex({ throwOnError: false }),
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return code;
    },
  }),
);

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}
