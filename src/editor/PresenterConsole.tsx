import { useEffect, useMemo, useState } from "react";
import { useProject } from "../state/ProjectContext";
import {
  formatBudget,
  formatClock,
  pace,
  parseNoteMinutes,
  plannedMinutes,
} from "./console-timing";

interface Props {
  onHide: () => void;
}

/**
 * Speaker console for the editor window. The presenter window goes on the
 * projector, so this is where the notes, the clock and the next waypoint live.
 */
export default function PresenterConsole({ onHide }: Props) {
  const { project, selectedWaypointIndex } = useProject();
  const waypoints = project.waypoints;
  const current = waypoints[selectedWaypointIndex] ?? null;
  const next = waypoints[selectedWaypointIndex + 1] ?? null;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // dueBy is the plan up to (not including) the current waypoint: the clock
  // reading you should have had when you arrived here.
  const { total, dueBy } = useMemo(() => {
    const notes = waypoints.map((wp) => wp.notes);
    return {
      total: plannedMinutes(notes),
      dueBy: plannedMinutes(notes.slice(0, selectedWaypointIndex)),
    };
  }, [waypoints, selectedWaypointIndex]);

  const { state, label } = pace(elapsed, dueBy);
  const budget = current ? parseNoteMinutes(current.notes) : null;

  return (
    <section className="presenter-console" aria-label="Presenter console">
      <div className="console-clock">
        <span className="console-time">{formatClock(elapsed)}</span>
        <span className={`console-pace ${state}`}>{label}</span>
        <span className="console-total">plan ~{Math.round(total)} min</span>
        <div className="console-actions">
          <button onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => {
              setElapsed(0);
              setRunning(true);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="console-notes">
        <div className="console-meta">
          <span className="console-pos">
            {Math.min(selectedWaypointIndex + 1, waypoints.length)} /{" "}
            {waypoints.length}
          </span>
          <span className="console-title">{current?.title ?? "No waypoint"}</span>
          {budget !== null && (
            <span className="console-budget">planned {formatBudget(budget)}</span>
          )}
        </div>
        <p className="console-note-body">
          {current?.notes || "No speaker notes for this waypoint."}
        </p>
      </div>

      <div className="console-next">
        <div className="console-next-head">
          <span className="console-next-label">Next</span>
          <button className="console-hide" onClick={onHide}>
            Hide
          </button>
        </div>
        <span className="console-next-title">{next?.title ?? "End of deck"}</span>
      </div>
    </section>
  );
}
