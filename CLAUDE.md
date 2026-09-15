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
│   ├── pdf-worker.ts                  # pdfjs worker setup
│   ├── PdfViewer.tsx                  # Shared PDF viewer (PdfLoader + PdfHighlighter)
│   └── zoom.ts                        # Zoom arithmetic + ZoomApi (keys, Ctrl+wheel, overlay)
├── editor/
│   ├── EditorShell.tsx                # Editor layout + cross-window sync
│   ├── EditorToolbar.tsx              # File ops, title, Present button
│   ├── EditorPdfPanel.tsx             # PDF viewer with highlight creation
│   ├── HighlightSelectionTip.tsx      # Label/color picker for new highlights
│   ├── WaypointList.tsx               # Drag-and-drop waypoint list (@dnd-kit)
│   ├── WaypointItem.tsx               # Sortable waypoint list item
│   ├── WaypointEditor.tsx             # Inspector panel for editing waypoints
│   ├── use-panel-resize.ts            # Drag-to-resize hook for the inspector width
│   └── use-stored-pref.ts             # localStorage-backed editor preferences (content wrap)
├── presenter/
│   ├── PresenterShell.tsx             # Presenter layout + event listeners
│   ├── PresenterPdfView.tsx           # Read-only PDF viewer
│   ├── PresenterSidebar.tsx           # Waypoint content sidebar
│   ├── ProgressBar.tsx                # Waypoint progress indicator
│   ├── ZoomOverlay.tsx                # Corner zoom readout + buttons over the PDF
│   ├── MarkdownRenderer.tsx           # Markdown/LaTeX/code rendering
│   ├── use-keyboard-nav.ts           # Arrow key navigation hook
│   └── use-keyboard-nav.test.ts      # Tests for clampedNav
├── state/
│   ├── ProjectContext.tsx             # React Context provider for project state
│   ├── project-reducer.ts            # State reducer (actions + transitions)
│   ├── project-reducer.test.ts        # Reducer tests
│   ├── event-bridge.ts               # Cross-window event communication
│   ├── file-io.ts                    # File I/O via Tauri plugin-fs
│   └── asset-url.ts                  # Asset URL resolution
├── types/
│   ├── project.ts                    # Domain types: Waypoint, PdfHighlight, etc.
│   ├── events.ts                     # Event type definitions
│   └── index.ts                      # Barrel re-exports
└── styles/
    ├── theme.css                     # Catppuccin Mocha palette + reset
    ├── editor.css                    # Editor grid layout
    ├── waypoints.css                 # Waypoint list + editor form
    └── presenter.css                 # Presenter layout + sidebar + progress
```

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

The script creates a worktree, runs Claude with the task spec, then verifies with `pnpm run build` && `pnpm run test:coverage` (enforces coverage thresholds: 70% statements/functions/lines, 65% branches). On failure it resumes the same Claude session with the error output. Logs go to `logs/`.

**Task specs** live in `tasks/` — see `tasks/TEMPLATE.md` for the format.

## Work style

Work autonomously. After completing a task, identify and start the next logical task immediately — don't ask for feedback, input, or approval between tasks. Keep working until there's nothing obvious left to improve or the context window is exhausted.

## Do NOT

- Modify files in `dist/` — this is build output, regenerated by `pnpm run build`
- Modify files in `legacy/` — archived reference files
- Run `pnpm tauri dev` or `pnpm tauri build` from subagents/worktrees — Tauri requires a windowing system and should only be run from the main thread
