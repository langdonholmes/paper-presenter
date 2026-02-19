import { useEffect, useRef } from "react";
import { ProjectProvider, useProject } from "../state/ProjectContext";
import {
  emitProjectUpdated,
  emitNavigateToWaypoint,
} from "../state/event-bridge";
import { ToastProvider } from "../lib/ToastContext";
import EditorToolbar from "./EditorToolbar";
import WaypointList from "./WaypointList";
import WaypointEditor from "./WaypointEditor";
import EditorPdfPanel from "./EditorPdfPanel";
import "../styles/editor.css";
import "../styles/toast.css";

function EditorContent() {
  const { project, pdfUrl, selectedWaypointIndex, doSave, doSaveAs, doNew, doOpen } =
    useProject();

  // Emit project state to presenter (debounced)
  const emitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(emitTimer.current);
    emitTimer.current = setTimeout(() => {
      emitProjectUpdated({ project, pdfUrl }).catch(() => {});
    }, 200);
    return () => clearTimeout(emitTimer.current);
  }, [project, pdfUrl]);

  // Emit waypoint navigation to presenter
  useEffect(() => {
    const wp = project.waypoints[selectedWaypointIndex];
    if (wp) {
      emitNavigateToWaypoint({
        index: selectedWaypointIndex,
        waypoint: wp,
      }).catch(() => {});
    }
  }, [selectedWaypointIndex, project.waypoints]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case "s":
          e.preventDefault();
          if (e.shiftKey) doSaveAs();
          else doSave();
          break;
        case "n":
          e.preventDefault();
          doNew();
          break;
        case "o":
          e.preventDefault();
          doOpen();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doSave, doSaveAs, doNew, doOpen]);

  return (
    <div className="editor-shell">
      <EditorToolbar />

      <div className="editor-panel-waypoints">
        <WaypointList />
      </div>

      <div className="editor-panel-pdf">
        <EditorPdfPanel />
      </div>

      <div className="editor-panel-inspector">
        <WaypointEditor />
      </div>
    </div>
  );
}

export default function EditorShell() {
  return (
    <ToastProvider>
      <ProjectProvider>
        <EditorContent />
      </ProjectProvider>
    </ToastProvider>
  );
}
