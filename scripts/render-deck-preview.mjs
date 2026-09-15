// Render every waypoint's sidebar through the app's own markdown pipeline
// into one standalone HTML page, so the content can be eyeballed without Tauri.
import { readFileSync, writeFileSync } from "node:fs";
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";

const repo = "C:/GitHub/paper-presenter";
const projectPath = process.argv[2];
const outPath = process.argv[3];
const project = JSON.parse(readFileSync(projectPath, "utf8"));
const marked = new Marked(markedKatex({ throwOnError: false }));
const css = ["src/styles/theme.css", "src/styles/presenter.css"]
  .map((p) => readFileSync(`${repo}/${p}`, "utf8"))
  .join("\n");
const katexCss = `file:///${repo}/node_modules/katex/dist/katex.min.css`;

const blocks = project.waypoints
  .map((wp, i) => {
    const html = marked.parse(wp.content);
    return `<section class="card" id="${wp.id}" style="width:${wp.sidebarWidth}">
<div class="meta">${i + 1} · ${wp.id} · ${wp.color} · ${wp.sidebarWidth}</div>
<aside class="presenter-sidebar" style="width:100%;min-width:0;max-width:none;position:static;height:auto">
<h2 class="presenter-sidebar-title">${wp.title}</h2>
<div class="presenter-sidebar-content">${html}</div>
</aside></section>`;
  })
  .join("\n");

writeFileSync(
  outPath,
  `<!doctype html><html><head><meta charset="utf-8"><title>deck preview</title>
<link rel="stylesheet" href="${katexCss}">
<style>${css}
body{background:var(--ctp-crust);padding:24px;display:flex;flex-direction:column;gap:32px;align-items:flex-start}
.card{max-width:1600px}
.meta{font:12px monospace;color:var(--ctp-overlay1);margin-bottom:6px}
</style></head><body>${blocks}
<script>const h=location.hash.slice(1);if(h){for(const c of document.querySelectorAll('.card')){if(c.id!==h)c.hidden=true;}}</script></body></html>`,
);
console.log("wrote", outPath, project.waypoints.length, "waypoints");
