import { useEffect, useRef } from "react";
import { ProjectProvider, useProject } from "../state/ProjectContext";
import {
  emitProjectUpdated,
  emitNavigateToWaypoint,
} from "../state/event-bridge";
import EditorToolbar from "./EditorToolbar";
import WaypointList from "./WaypointList";
import WaypointEditor from "./WaypointEditor";
import EditorPdfPanel from "./EditorPdfPanel";
import "../styles/editor.css";

function EditorContent() {
  const { project, pdfUrl, selectedWaypointIndex } = useProject();

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
    <ProjectProvider>
      <EditorContent />
    </ProjectProvider>
  );
}
