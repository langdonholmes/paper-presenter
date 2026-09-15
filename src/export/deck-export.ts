import type { PdfHighlight, ProjectFile, Waypoint } from "../types";
import { renderMarkdown } from "../lib/markdown";

/**
 * Which page of the paper a waypoint lands on.
 *
 * The waypoint's own `page` is the authored override and wins when set, but it
 * is optional and usually isn't — the page is normally implied by whichever
 * highlight the waypoint scrolls to. Reading only `page` would leave most
 * waypoints in a real deck with no page reference at all, which is the one
 * thing the export exists to carry across to the paper.
 */
export function waypointPage(
  waypoint: Waypoint,
  highlights: PdfHighlight[],
): number | null {
  if (waypoint.page != null) return waypoint.page;
  if (!waypoint.highlightRef) return null;
  const hl = highlights.find((h) => h.id === waypoint.highlightRef);
  return hl?.position.boundingRect.pageNumber ?? null;
}

/** Final path segment, for either separator. */
export function basename(path: string): string {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return cut === -1 ? path : path.slice(cut + 1);
}

/** The HTML backup's path for a given project file. */
export function htmlPathFor(projectPath: string): string {
  return projectPath.replace(/(\.paperp)?\.json$/i, "") + ".html";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Light, not the app's Catppuccin dark. The export is a fallback that gets
 * printed, saved as PDF, and read on whatever machine is to hand, and a dark
 * document survives none of those well.
 */
const DECK_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 32px 24px 64px;
  background: #f4f4f6;
  color: #16161a;
  font: 17px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.deck { max-width: 900px; margin: 0 auto; }
.deck-title { font-size: 28px; margin: 0 0 4px; }
.deck-sub { color: #61616b; font-size: 14px; margin: 0 0 32px; }
.wp {
  background: #fff;
  border: 1px solid #dededf;
  border-radius: 10px;
  padding: 24px 28px 28px;
  margin-bottom: 20px;
}
.wp-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  border-bottom: 1px solid #ececed;
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.wp-num {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 600;
  color: #7a7a85;
  white-space: nowrap;
}
.wp-title { font-size: 21px; margin: 0; flex: 1; }
.wp-page {
  font-size: 13px;
  font-weight: 600;
  color: #3a5ca8;
  background: #eaf0fb;
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
}
.wp-body > :first-child { margin-top: 0; }
.wp-body > :last-child { margin-bottom: 0; }
.wp-body img { max-width: 100%; }
.wp-body pre {
  background: #f6f6f8;
  border: 1px solid #e6e6e8;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}
.wp-body code { font-size: 0.92em; }
.wp-body table { border-collapse: collapse; }
.wp-body th, .wp-body td { border: 1px solid #dededf; padding: 6px 10px; }
.wp-empty { color: #8a8a94; font-style: italic; font-size: 15px; }

@media print {
  /* Own the margins rather than inheriting whatever the print dialog defaults
     to, so a deck printed with margins off is still readable. */
  @page { margin: 16mm; }
  body { background: #fff; padding: 0; font-size: 12pt; }
  .deck { max-width: none; }
  .deck-title, .deck-sub { display: none; }
  .wp {
    border: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
    break-after: page;
    page-break-after: always;
    break-inside: avoid-page;
  }
  .wp:last-child { break-after: auto; page-break-after: auto; }
}
`;

function renderWaypoint(
  waypoint: Waypoint,
  index: number,
  total: number,
  highlights: PdfHighlight[],
): string {
  const page = waypointPage(waypoint, highlights);
  const pageTag =
    page != null ? `<span class="wp-page">p.&nbsp;${page}</span>` : "";
  const title = escapeHtml(waypoint.title || "Untitled");
  const body = waypoint.content.trim()
    ? renderMarkdown(waypoint.content)
    : `<p class="wp-empty">No sidebar content — this waypoint shows the paper alone.</p>`;

  return `<section class="wp" id="wp-${index + 1}">
<header class="wp-head"><span class="wp-num">${index + 1} / ${total}</span><h2 class="wp-title">${title}</h2>${pageTag}</header>
<div class="wp-body">${body}</div>
</section>`;
}

export interface DeckHtmlOptions {
  /**
   * KaTeX stylesheet with its fonts already inlined. Omitted when the deck
   * renders no math, which keeps a typical export near 20KB instead of 400KB.
   */
  katexCss?: string;
  generatedAt?: Date;
}

/**
 * The whole deck as one standalone HTML document: no scripts, no network, no
 * relative paths. It has to open on a machine that has never seen this app.
 */
export function buildDeckHtml(
  project: ProjectFile,
  options: DeckHtmlOptions = {},
): string {
  const { waypoints, highlights } = project;
  const total = waypoints.length;
  const sections = waypoints
    .map((wp, i) => renderWaypoint(wp, i, total, highlights))
    .join("\n");

  const needsKatex = sections.includes("katex");
  const katexCss = needsKatex && options.katexCss ? options.katexCss : "";

  const deckTitle = project.meta.title || "Untitled presentation";
  const pdfName = project.pdfPath ? basename(project.pdfPath) : "";
  // Kept out of the body on request: the tab title is also what browsers put in
  // the printed page header, so the PDF carries the paper's filename without
  // the screen version showing it.
  const docTitle = pdfName ? `${deckTitle} — ${pdfName}` : deckTitle;
  const date = (options.generatedAt ?? new Date()).toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
<meta name="generator" content="paper-presenter">
<meta name="source-pdf" content="${escapeHtml(pdfName)}">
<meta name="exported" content="${date}">
<style>${katexCss}${DECK_CSS}</style>
</head>
<body>
<main class="deck">
<h1 class="deck-title">${escapeHtml(deckTitle)}</h1>
<p class="deck-sub">${total} waypoint${total === 1 ? "" : "s"} · exported ${date}</p>
${sections}
</main>
</body>
</html>
`;
}
