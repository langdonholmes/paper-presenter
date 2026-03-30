import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
    let unmounted = false;
    const unlisteners: (() => void)[] = [];

    async function setup() {
      const u1 = await onProjectUpdated((payload) => {
        setProject(payload.project);
        setPdfUrl(payload.pdfUrl);
      });
      if (unmounted) { u1(); return; }
      unlisteners.push(u1);

      const u2 = await onNavigateToWaypoint((payload) => {
        setIndex(payload.index);
      });
      if (unmounted) { u2(); return; }
      unlisteners.push(u2);

      const u3 = await onWaypointChanged((payload) => {
        setProject((prev) => {
          if (!prev) return prev;
          const waypoints = prev.waypoints.map((wp, i) =>
            i === payload.index ? payload.waypoint : wp,
          );
          return { ...prev, waypoints };
        });
      });
      if (unmounted) { u3(); return; }
      unlisteners.push(u3);
    }

    setup();

    return () => {
      unmounted = true;
      for (const fn of unlisteners) fn();
    };
  }, [setIndex]);

  // Hide (instead of destroy) on close button and Escape key
  useEffect(() => {
    const win = getCurrentWindow();
    const unlistenClose = win.onCloseRequested((e) => {
      e.preventDefault();
      win.hide();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        win.hide();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlistenClose.then((fn) => fn());
    };
  }, []);

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
          scrollAlign={waypoint?.scrollAlign}
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
