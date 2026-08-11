# paper-presenter

Desktop app for presenting academic papers: a PDF with highlights, and a list of
waypoints that jump to them with your notes alongside.

## Run it

```bash
pnpm install
pnpm tauri dev
```

That opens the **editor** window. `pnpm run dev` starts the frontend alone on
port 1420 — useful for UI work, but file dialogs and the presenter window need
the full Tauri shell.

## Present

1. Open a `.paperp.json` project (**Open**, or `Ctrl+O`).
2. Click **Present**. A second window opens — drag it to the projector.
3. Drive it with `←` / `→` from either window; the two stay in sync.

While presenting, a **speaker console** appears along the bottom of the editor
window with your notes, the next waypoint, and a clock that paces you against
the `~2 min` estimates at the front of each note. `Esc` hides the presenter
window.

## Edit

Select a waypoint on the left to edit its content (markdown, LaTeX, tables) on
the right. Drag to reorder. Select text in the PDF — or drag a box — to make a
highlight, then point a waypoint at it so the presenter scrolls there.

Waypoint content also accepts raw HTML, and `src/styles/presenter.css` ships
`pp-*` classes (panels, token cells, bar rows, diverging bars) for building
inline figures that match the theme.

## Develop

```bash
pnpm run build          # typecheck + build
pnpm run test           # unit tests
pnpm run test:coverage  # tests + coverage thresholds
cargo check             # from src-tauri/
```

See `CLAUDE.md` for architecture and conventions.
