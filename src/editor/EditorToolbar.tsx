import { useState, useEffect, useCallback } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useProject } from "../state/ProjectContext";
import { emitProjectUpdated } from "../state/event-bridge";

export default function EditorToolbar() {
  const { project, dispatch, pdfUrl, dirty, doNew, doOpen, doSave, doSaveAs, doSelectPdf } =
    useProject();

  const [title, setTitle] = useState(project.meta.title);

  useEffect(() => {
    setTitle(project.meta.title);
  }, [project.meta.title]);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== project.meta.title) {
      dispatch({ type: "SET_META", title: trimmed });
    } else {
      setTitle(project.meta.title);
    }
  };

  const handlePresent = useCallback(async () => {
    const win = await WebviewWindow.getByLabel("presenter");
    if (win) {
      await win.show();
      await win.setFocus();
      // Give the window a moment to initialize, then send project state
      setTimeout(() => {
        emitProjectUpdated({ project, pdfUrl }).catch(() => {});
      }, 100);
    }
  }, [project, pdfUrl]);

  return (
    <div className="editor-toolbar">
      <button onClick={doNew} title="New project (Ctrl+N)">New</button>
      <button onClick={doOpen} title="Open project (Ctrl+O)">Open</button>
      <button onClick={doSave} title="Save project (Ctrl+S)">Save</button>
      <button onClick={doSaveAs} title="Save As (Ctrl+Shift+S)">Save As</button>

      <span className="toolbar-sep" />

      <button onClick={doSelectPdf}>PDF</button>

      <span className="toolbar-sep" />

      <input
        className="title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="Untitled project"
      />
      {dirty && <span className="dirty-dot" title="Unsaved changes" />}

      <span className="spacer" />

      <button className="primary" onClick={handlePresent}>
        Present
      </button>
    </div>
  );
}
