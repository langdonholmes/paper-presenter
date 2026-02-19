import { v4 as uuid } from "uuid";
import type { ProjectFile, Waypoint, PdfHighlight } from "../types";

// ── Actions ──

export type ProjectAction =
  | { type: "LOAD_PROJECT"; project: ProjectFile }
  | { type: "SET_META"; title: string }
  | { type: "SET_PDF_PATH"; pdfPath: string }
  | { type: "ADD_WAYPOINT"; waypoint: Waypoint; index?: number }
  | { type: "UPDATE_WAYPOINT"; id: string; patch: Partial<Omit<Waypoint, "id">> }
  | { type: "DELETE_WAYPOINT"; id: string }
  | { type: "REORDER_WAYPOINTS"; fromIndex: number; toIndex: number }
  | { type: "ADD_HIGHLIGHT"; highlight: PdfHighlight }
  | { type: "UPDATE_HIGHLIGHT"; id: string; patch: Partial<Omit<PdfHighlight, "id">> }
  | { type: "DELETE_HIGHLIGHT"; id: string };

// ── Factories ──

export function createEmptyProject(): ProjectFile {
  return {
    version: 1,
    meta: {
      title: "Untitled",
      defaults: { sidebarWidth: "35%", sidebar: true },
    },
    pdfPath: "",
    highlights: [],
    waypoints: [],
  };
}

export function createEmptyWaypoint(
  overrides?: Partial<Waypoint>,
): Waypoint {
  return {
    id: uuid(),
    title: "New Waypoint",
    content: "",
    notes: "",
    page: null,
    scrollY: null,
    highlightRef: null,
    color: null,
    sidebarWidth: "35%",
    sidebar: true,
    ...overrides,
  };
}

// ── Reducer ──

export function projectReducer(
  state: ProjectFile,
  action: ProjectAction,
): ProjectFile {
  switch (action.type) {
    case "LOAD_PROJECT":
      return action.project;

    case "SET_META":
      return {
        ...state,
        meta: { ...state.meta, title: action.title },
      };

    case "SET_PDF_PATH":
      return { ...state, pdfPath: action.pdfPath };

    case "ADD_WAYPOINT": {
      const wps = [...state.waypoints];
      const idx = action.index ?? wps.length;
      wps.splice(idx, 0, action.waypoint);
      return { ...state, waypoints: wps };
    }

    case "UPDATE_WAYPOINT":
      return {
        ...state,
        waypoints: state.waypoints.map((wp) =>
          wp.id === action.id ? { ...wp, ...action.patch } : wp,
        ),
      };

    case "DELETE_WAYPOINT":
      return {
        ...state,
        waypoints: state.waypoints.filter((wp) => wp.id !== action.id),
      };

    case "REORDER_WAYPOINTS": {
      const wps = [...state.waypoints];
      const [moved] = wps.splice(action.fromIndex, 1);
      wps.splice(action.toIndex, 0, moved);
      return { ...state, waypoints: wps };
    }

    case "ADD_HIGHLIGHT":
      return {
        ...state,
        highlights: [...state.highlights, action.highlight],
      };

    case "UPDATE_HIGHLIGHT":
      return {
        ...state,
        highlights: state.highlights.map((hl) =>
          hl.id === action.id ? { ...hl, ...action.patch } : hl,
        ),
      };

    case "DELETE_HIGHLIGHT":
      return {
        ...state,
        highlights: state.highlights.filter((hl) => hl.id !== action.id),
        waypoints: state.waypoints.map((wp) =>
          wp.highlightRef === action.id
            ? { ...wp, highlightRef: null }
            : wp,
        ),
      };
  }
}
