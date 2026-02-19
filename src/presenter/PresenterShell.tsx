import { useState, useEffect } from "react";
import type { ProjectFile } from "../types";
import {
  onProjectUpdated,
  onNavigateToWaypoint,
  onWaypointChanged,
  emitPresenterState,
} from "../state/event-bridge";
import { useKeyboardNav } from "./use-keyboard-nav";
import ProgressBar from "./ProgressBar";
import PresenterPdfView from "./PresenterPdfView";
import PresenterSidebar from "./PresenterSidebar";
import "../styles/presenter.css";

export default function PresenterShell() {
  const [project, setProject] = useState<ProjectFile | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const waypointCount = project?.waypoints.length ?? 0;
  const { index, setIndex } = useKeyboardNav(waypointCount);

  const waypoint = project?.waypoints[index] ?? null;
  const scrollToId = waypoint?.highlightRef ?? null;

  // Listen for cross-window events
  useEffect(() => {
    const unsubs: Promise<() => void>[] = [];

    unsubs.push(
      onProjectUpdated((payload) => {
        setProject(payload.project);
        setPdfUrl(payload.pdfUrl);
      }),
    );

    unsubs.push(
      onNavigateToWaypoint((payload) => {
        setIndex(payload.index);
      }),
    );

    unsubs.push(
      onWaypointChanged((payload) => {
        setProject((prev) => {
          if (!prev) return prev;
          const waypoints = prev.waypoints.map((wp, i) =>
            i === payload.index ? payload.waypoint : wp,
          );
          return { ...prev, waypoints };
        });
      }),
    );

    return () => {
      unsubs.forEach((p) => p.then((fn) => fn()));
    };
  }, [setIndex]);

  // Emit presenter state back to editor when index changes
  useEffect(() => {
    if (!project) return;
    emitPresenterState({
      currentIndex: index,
      total: waypointCount,
      isPresenting: true,
    }).catch(() => {});
  }, [index, waypointCount, project]);

  if (!project || !pdfUrl) {
    return (
      <div className="presenter-shell">
        <div className="presenter-waiting">Waiting for project data...</div>
      </div>
    );
  }

  return (
    <div className="presenter-shell">
      <ProgressBar current={index} total={waypointCount} />
      <div className="presenter-body">
        <PresenterPdfView
          pdfUrl={pdfUrl}
          highlights={project.highlights}
          scrollToHighlightId={scrollToId}
        />
        {waypoint?.sidebar && (
          <PresenterSidebar
            waypoint={waypoint}
            width={waypoint.sidebarWidth}
          />
        )}
      </div>
    </div>
  );
}
