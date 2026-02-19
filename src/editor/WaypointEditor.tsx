import { useState, useEffect, useRef, useCallback } from "react";
import { useProject } from "../state/ProjectContext";
import MilkdownEditor from "./MilkdownEditor";
import type { Waypoint } from "../types";

function useDebouncedPatch(id: string, delay = 300) {
  const { dispatch } = useProject();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, [id]);

  return useCallback(
    (patch: Partial<Omit<Waypoint, "id">>) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        dispatch({ type: "UPDATE_WAYPOINT", id, patch });
      }, delay);
    },
    [dispatch, id, delay],
  );
}

export default function WaypointEditor() {
  const { project, dispatch, selectedWaypointIndex } = useProject();
  const wp = project.waypoints[selectedWaypointIndex] ?? null;

  const [title, setTitle] = useState(wp?.title ?? "");
  const [notes, setNotes] = useState(wp?.notes ?? "");
  const [page, setPage] = useState(wp?.page ?? "");
  const [highlightRef, setHighlightRef] = useState(wp?.highlightRef ?? "");
  const [sidebar, setSidebar] = useState(wp?.sidebar ?? true);
  const [sidebarWidth, setSidebarWidth] = useState(wp?.sidebarWidth ?? "35%");

  // Sync local state when selected waypoint changes
  useEffect(() => {
    if (!wp) return;
    setTitle(wp.title);
    setNotes(wp.notes);
    setPage(wp.page ?? "");
    setHighlightRef(wp.highlightRef ?? "");
    setSidebar(wp.sidebar);
    setSidebarWidth(wp.sidebarWidth);
  }, [wp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedPatch = useDebouncedPatch(wp?.id ?? "");

  if (!wp) {
    return <div className="wp-editor-empty">No waypoint selected</div>;
  }

  const immediateDispatch = (patch: Partial<Omit<Waypoint, "id">>) => {
    dispatch({ type: "UPDATE_WAYPOINT", id: wp.id, patch });
  };

  return (
    <div className="wp-editor-form">
      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            debouncedPatch({ title: e.target.value });
          }}
        />
      </label>

      <label>
        Content
        <MilkdownEditor
          key={wp.id}
          defaultValue={wp.content}
          onChange={(markdown) => debouncedPatch({ content: markdown })}
        />
      </label>

      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            debouncedPatch({ notes: e.target.value });
          }}
        />
      </label>

      <label>
        Page
        <input
          type="number"
          min={1}
          value={page}
          onChange={(e) => {
            const val = e.target.value;
            setPage(val === "" ? "" : Number(val));
            immediateDispatch({
              page: val === "" ? null : Number(val),
            });
          }}
        />
      </label>

      <label>
        Highlight
        <select
          value={highlightRef}
          onChange={(e) => {
            setHighlightRef(e.target.value);
            immediateDispatch({
              highlightRef: e.target.value || null,
            });
          }}
        >
          <option value="">None</option>
          {project.highlights.map((hl) => (
            <option key={hl.id} value={hl.id}>
              {hl.label}
            </option>
          ))}
        </select>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={sidebar}
          onChange={(e) => {
            setSidebar(e.target.checked);
            immediateDispatch({ sidebar: e.target.checked });
          }}
        />
        Show sidebar
      </label>

      <label>
        Sidebar width
        <input
          type="text"
          value={sidebarWidth}
          onChange={(e) => {
            setSidebarWidth(e.target.value);
            debouncedPatch({ sidebarWidth: e.target.value });
          }}
        />
      </label>
    </div>
  );
}
