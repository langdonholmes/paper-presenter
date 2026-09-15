# paper-presenter

Tauri desktop app for presenting academic papers with PDF highlights and navigable waypoints.

## Commands

```bash
pnpm run dev          # Vite dev server (frontend only, port 1420)
pnpm run build        # TypeScript check + Vite build
pnpm tauri dev        # Full Tauri dev (frontend + Rust backend)
pnpm tauri build      # Production build
pnpm run test         # Run vitest unit tests (fast, no coverage)
pnpm run test:watch   # Run vitest in watch mode
pnpm run test:coverage # Run tests with V8 coverage + threshold enforcement
cargo test            # Run Rust tests (from src-tauri/)
cargo check           # Type-check Rust code (from src-tauri/)
node scripts/render-deck-preview.mjs <project.paperp.json> <out.html>  # Render every waypoint sidebar to one HTML page (no Tauri needed); open with #wp-NN to isolate one
```

## Architecture

**Dual-window Tauri app** with React frontend and Rust backend.

- **Editor window** (`#/editor`): Edit waypoints, manage highlights, configure presentations
- **Presenter window** (`#/presenter`): Display mode for presenting papers

### Frontend (TypeScript/React)

```
src/
├── main.tsx                           # Entry point, React Router (HashRouter)
├── lib/
│   ├── PdfViewer.tsx                  # Shared PDF viewer (PdfLoader + PdfHighlighter)
│   ├── highlight-view.ts              # Highlight paint/focus rules + scroll alignment math
│   ├── snap-to-word.ts                # Word-boundary snapping geometry (pure)
│   ├── pdf-word-snap.ts               # Applies snapping against the rendered pdf.js page
│   ├── zoom.ts                        # Zoom arithmetic + ZoomApi (keys, Ctrl+wheel, overlay)
│   ├── markdown.ts                    # Shared marked+KaTeX+highlight.js pipeline
│   └── ToastContext.tsx               # Toast notifications
├── editor/
│   ├── EditorShell.tsx                # Editor layout + cross-window sync
│   ├── EditorToolbar.tsx              # File ops, title, Present button
│   ├── EditorPdfPanel.tsx             # PDF viewer with highlight creation + snap-all
│   ├── HighlightSelectionTip.tsx      # Label/color picker for new highlights
│   ├── HighlightEditTip.tsx           # Edit/delete tip for an existing highlight
│   ├── WaypointList.tsx               # Drag-and-drop waypoint list (@dnd-kit)
│   ├── WaypointItem.tsx               # Sortable waypoint list item
│   ├── WaypointEditor.tsx             # Inspector panel for editing waypoints
│   ├── PresenterConsole.tsx           # Speaker notes + pacing, shown in the editor window
│   ├── console-timing.ts              # Timing helpers for the presenter console
│   ├── use-panel-resize.ts            # Drag-to-resize hook for the inspector width
│   └── use-stored-pref.ts             # localStorage-backed editor preferences (content wrap)
├── presenter/
│   ├── PresenterShell.tsx             # Presenter layout + event listeners
│   ├── PresenterPdfView.tsx           # Read-only PDF viewer
│   ├── PresenterSidebar.tsx           # Waypoint content sidebar
│   ├── ProgressBar.tsx                # Waypoint progress indicator
│   ├── ZoomOverlay.tsx                # Corner zoom readout + buttons over the PDF
│   ├── MarkdownRenderer.tsx           # Markdown/LaTeX/code rendering
│   └── use-keyboard-nav.ts            # Arrow key navigation hook
├── export/
│   ├── deck-export.ts                 # Deck -> standalone HTML backup (pure)
│   ├── deck-export-io.ts              # Save dialog + file write for the export
│   ├── katex-assets.ts                # KaTeX CSS with its fonts inlined as data URIs
│   └── figure-assets.ts               # pp-* figure CSS + theme vars, scoped for the export
├── state/
│   ├── ProjectContext.tsx             # React Context provider for project state
│   ├── project-reducer.ts             # State reducer (actions + transitions)
│   ├── event-bridge.ts                # Cross-window event communication
│   ├── file-io.ts                     # File I/O via Tauri plugin-fs
│   └── asset-url.ts                   # Asset URL resolution
├── types/
│   ├── project.ts                     # Domain types: Waypoint, PdfHighlight, etc.
│   ├── events.ts                      # Event type definitions
│   └── index.ts                       # Barrel re-exports
└── styles/
    ├── theme.css                      # Catppuccin Mocha palette + reset
    ├── editor.css                     # Editor grid layout
    ├── waypoints.css                  # Waypoint list + editor form
    ├── toast.css                      # Toast notifications
    └── presenter.css                  # Presenter layout + sidebar + progress
```

Tests are colocated as `*.test.ts(x)` next to the module they cover.

### Backend (Rust/Tauri)

```
src-tauri/src/
├── main.rs                     # Entry point (delegates to lib.rs)
└── lib.rs                      # Tauri setup, plugins, commands
```

### Key dependencies

- **pdfjs-dist + react-pdf-highlighter-extended** — PDF rendering and highlighting
- **@dnd-kit** — Drag-and-drop for waypoint reordering
- **marked + katex** — Markdown/LaTeX rendering in presenter view

## Conventions

- State management via React Context + useReducer (see `state/ProjectContext.tsx`)
- Cross-window communication via Tauri event system (see `state/event-bridge.ts`)
- Types defined in `src/types/`, re-exported via barrel `index.ts`
- File I/O goes through `state/file-io.ts` (uses Tauri plugin-fs and plugin-dialog)

## Embedded HTML in waypoint content

Waypoint content accepts raw HTML for inline figures. Build it from the `pp-*`
primitives in `styles/pp-figures.css`, and take every colour from a theme
variable in `styles/theme.css`.

**The rule: no hex literals, no `<style>` blocks, no inline colours.**

**Why.** For embedded figures the HTML export inlines exactly two things —
`pp-figures.css` and the `:root` variables from `theme.css`. Nothing else
travels with the markup. A
figure that hardcodes `#89b4fa` instead of `var(--ctp-blue)` looks perfect in the
app and silently loses its styling in the backup, which you discover only when
the app is unavailable and the backup is all you have. These figures were
originally built with bespoke inline `<style>` blocks (see 9133adf); none of
that would survive an export.

**Primitives** — panels (`pp-fig`, `pp-panel`, `pp-head`, `pp-tag`, `pp-kicker`),
token sequences (`pp-seq`, `pp-cell`, `pp-cell--mask|--set|--new`, `pp-slot`,
`pp-mask`), step traces (`pp-steps`, `pp-step`, `pp-locked`), bar rows
(`pp-row`, `pp-label`, `pp-track`, `pp-bar`, `pp-val`), diverging bars
(`pp-dv`, `pp-dead`), outcome dots (`pp-dots`, `pp-dot--ok|--no`, `pp-x`),
captions and footers (`pp-cont`, `pp-foot`, `pp-src`, `pp-stat`, `pp-why`).

**Authoring seams** — these four are the only things to set inline:

- `--pp-hue` on a panel recolours its accent. Give it a palette variable
  (`--pp-hue: var(--ctp-blue)`), never a literal.
- `--pp-label` / `--pp-value` resize the outer columns of a `pp-row`.
- `--w` on a `pp-bar` sets bar length.

Add a new primitive to `pp-figures.css` rather than styling one figure inline.

## HTML backup export

The editor's **Export** button writes the deck as a single standalone HTML file
(no scripts, no network, no relative paths), and every save refreshes a copy
beside the `.paperp.json`. It carries waypoint titles, rendered content, and the
paper page each waypoint lands on — enough to present from if the app is
unavailable. Speaker notes are deliberately excluded.

- `page` falls back to the referenced highlight's page, which is where most
  waypoints actually get theirs.
- KaTeX CSS and fonts are inlined only when the deck renders maths (~385KB with,
  ~38KB without).
- Embedded `pp-*` figures are inlined from `styles/pp-figures.css` with the
  theme variables scoped to `.pp-fig`, so they keep the dark palette they were
  designed against rather than the export inventing a light contract only it
  would exercise. See "Embedded HTML in waypoint content" for the authoring rule
  this depends on.
- `@media print` puts one waypoint per page, so Cmd+P gives a PDF.
- A failed backup raises a toast rather than failing silently.

## Worktree conventions

For parallel agent work, use the worktree scripts:

```bash
./scripts/wt-new.sh <branch-name> [prompt]   # Create worktree + launch agent
./scripts/wt-cleanup.sh <branch-name>        # Remove worktree + delete branch
./scripts/wt-list.sh                         # List active worktrees
```

Each agent gets its own directory under `../paper-presenter-worktrees/`.

## Agent loop

For autonomous agent sessions with build+test+coverage verification:

```bash
./scripts/agent-loop.sh <branch-name> <task-spec-file> [options]
```

**Options:**
- `--max-retries N` — gate-failure retries (default: 3)
- `--max-turns N` — Claude agentic turns per attempt (default: 50)
- `--dangerously-skip-permissions` — skip permission prompts (devcontainer only)

The script creates a worktree, runs Claude with the task spec, then verifies with `pnpm run build` && `pnpm run test:coverage` (enforces the coverage thresholds in `vitest.config.ts`: 96% statements, 92% branches, 94% functions, 98% lines). On failure it resumes the same Claude session with the error output. Logs go to `logs/`.

**Task specs** live in `tasks/` — see `tasks/TEMPLATE.md` for the format.

## Work style

Work autonomously. After completing a task, identify and start the next logical task immediately — don't ask for feedback, input, or approval between tasks. Keep working until there's nothing obvious left to improve or the context window is exhausted.

## Do NOT

- Modify files in `dist/` — this is build output, regenerated by `pnpm run build`
- Modify files in `legacy/` — archived reference files
- Run `pnpm tauri dev` or `pnpm tauri build` from subagents/worktrees — Tauri requires a windowing system and should only be run from the main thread
