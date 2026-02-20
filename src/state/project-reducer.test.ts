import { describe, it, expect } from "vitest";
import {
  createEmptyProject,
  createEmptyWaypoint,
  projectReducer,
  type ProjectAction,
} from "./project-reducer";
import type {
  ProjectFile,
  PdfHighlight,
  Waypoint,
} from "../types";
import type { ScaledPosition } from "react-pdf-highlighter-extended";

// ── Fixtures ──

function makePosition(page = 1): ScaledPosition {
  return {
    boundingRect: { x1: 0, y1: 0, x2: 100, y2: 50, width: 612, height: 792, pageNumber: page },
    rects: [{ x1: 0, y1: 0, x2: 100, y2: 50, width: 612, height: 792, pageNumber: page }],
    usePdfCoordinates: false,
  };
}

function makeHighlight(id: string, page = 1): PdfHighlight {
  return {
    id,
    label: `Highlight ${id}`,
    position: makePosition(page),
    content: { text: "sample text" },
    color: "yellow",
  };
}

function makeWaypoint(overrides?: Partial<Waypoint>): Waypoint {
  return createEmptyWaypoint(overrides);
}

function apply(state: ProjectFile, ...actions: ProjectAction[]): ProjectFile {
  return actions.reduce(projectReducer, state);
}

// ── Tests ──

describe("createEmptyProject", () => {
  it("returns valid defaults", () => {
    const p = createEmptyProject();
    expect(p.version).toBe(1);
    expect(p.meta.title).toBe("Untitled");
    expect(p.pdfPath).toBe("");
    expect(p.highlights).toEqual([]);
    expect(p.waypoints).toEqual([]);
    expect(p.meta.defaults).toEqual({ sidebarWidth: "35%", sidebar: true });
  });
});

describe("createEmptyWaypoint", () => {
  it("generates a unique ID", () => {
    const a = createEmptyWaypoint();
    const b = createEmptyWaypoint();
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("applies overrides", () => {
    const wp = createEmptyWaypoint({ title: "Custom", page: 5 });
    expect(wp.title).toBe("Custom");
    expect(wp.page).toBe(5);
    expect(wp.content).toBe("");
  });
});

describe("projectReducer", () => {
  // ── Project-level actions ──

  describe("LOAD_PROJECT", () => {
    it("replaces entire state", () => {
      const fresh = createEmptyProject();
      const loaded: ProjectFile = {
        ...fresh,
        meta: { ...fresh.meta, title: "Loaded" },
        pdfPath: "/tmp/paper.pdf",
      };
      const result = apply(fresh, { type: "LOAD_PROJECT", project: loaded });
      expect(result).toEqual(loaded);
    });
  });

  describe("SET_META", () => {
    it("updates the title", () => {
      const state = createEmptyProject();
      const result = apply(state, { type: "SET_META", title: "New Title" });
      expect(result.meta.title).toBe("New Title");
      expect(result.meta.defaults).toEqual(state.meta.defaults);
    });
  });

  describe("SET_PDF_PATH", () => {
    it("updates the PDF path", () => {
      const state = createEmptyProject();
      const result = apply(state, {
        type: "SET_PDF_PATH",
        pdfPath: "/papers/test.pdf",
      });
      expect(result.pdfPath).toBe("/papers/test.pdf");
    });
  });

  // ── Waypoint CRUD ──

  describe("ADD_WAYPOINT", () => {
    it("appends by default", () => {
      const wp1 = makeWaypoint({ title: "First" });
      const wp2 = makeWaypoint({ title: "Second" });
      const state = createEmptyProject();
      const result = apply(
        state,
        { type: "ADD_WAYPOINT", waypoint: wp1 },
        { type: "ADD_WAYPOINT", waypoint: wp2 },
      );
      expect(result.waypoints).toHaveLength(2);
      expect(result.waypoints[0].title).toBe("First");
      expect(result.waypoints[1].title).toBe("Second");
    });

    it("inserts at specific index", () => {
      const wp1 = makeWaypoint({ title: "First" });
      const wp2 = makeWaypoint({ title: "Second" });
      const wp3 = makeWaypoint({ title: "Inserted" });
      const state = apply(
        createEmptyProject(),
        { type: "ADD_WAYPOINT", waypoint: wp1 },
        { type: "ADD_WAYPOINT", waypoint: wp2 },
      );
      const result = apply(state, {
        type: "ADD_WAYPOINT",
        waypoint: wp3,
        index: 1,
      });
      expect(result.waypoints.map((w) => w.title)).toEqual([
        "First",
        "Inserted",
        "Second",
      ]);
    });
  });

  describe("UPDATE_WAYPOINT", () => {
    it("patches the matching waypoint", () => {
      const wp = makeWaypoint({ title: "Original" });
      const state = apply(createEmptyProject(), {
        type: "ADD_WAYPOINT",
        waypoint: wp,
      });
      const result = apply(state, {
        type: "UPDATE_WAYPOINT",
        id: wp.id,
        patch: { title: "Updated", page: 3 },
      });
      expect(result.waypoints[0].title).toBe("Updated");
      expect(result.waypoints[0].page).toBe(3);
      expect(result.waypoints[0].id).toBe(wp.id);
    });

    it("leaves other waypoints unchanged", () => {
      const wp1 = makeWaypoint({ title: "A" });
      const wp2 = makeWaypoint({ title: "B" });
      const state = apply(
        createEmptyProject(),
        { type: "ADD_WAYPOINT", waypoint: wp1 },
        { type: "ADD_WAYPOINT", waypoint: wp2 },
      );
      const result = apply(state, {
        type: "UPDATE_WAYPOINT",
        id: wp1.id,
        patch: { title: "A2" },
      });
      expect(result.waypoints[1].title).toBe("B");
    });
  });

  describe("DELETE_WAYPOINT", () => {
    it("removes the waypoint", () => {
      const wp = makeWaypoint();
      const state = apply(createEmptyProject(), {
        type: "ADD_WAYPOINT",
        waypoint: wp,
      });
      const result = apply(state, { type: "DELETE_WAYPOINT", id: wp.id });
      expect(result.waypoints).toHaveLength(0);
    });
  });

  describe("REORDER_WAYPOINTS", () => {
    it("moves a waypoint from one index to another", () => {
      const wps = [
        makeWaypoint({ title: "A" }),
        makeWaypoint({ title: "B" }),
        makeWaypoint({ title: "C" }),
      ];
      let state = createEmptyProject();
      for (const wp of wps) {
        state = apply(state, { type: "ADD_WAYPOINT", waypoint: wp });
      }
      // Move A (index 0) to index 2
      const result = apply(state, {
        type: "REORDER_WAYPOINTS",
        fromIndex: 0,
        toIndex: 2,
      });
      expect(result.waypoints.map((w) => w.title)).toEqual(["B", "C", "A"]);
    });
  });

  // ── Highlight CRUD ──

  describe("ADD_HIGHLIGHT", () => {
    it("appends a highlight", () => {
      const hl = makeHighlight("hl-1");
      const state = createEmptyProject();
      const result = apply(state, { type: "ADD_HIGHLIGHT", highlight: hl });
      expect(result.highlights).toHaveLength(1);
      expect(result.highlights[0].id).toBe("hl-1");
    });
  });

  describe("UPDATE_HIGHLIGHT", () => {
    it("patches the matching highlight", () => {
      const hl = makeHighlight("hl-1");
      const state = apply(createEmptyProject(), {
        type: "ADD_HIGHLIGHT",
        highlight: hl,
      });
      const result = apply(state, {
        type: "UPDATE_HIGHLIGHT",
        id: "hl-1",
        patch: { label: "Updated", color: "blue" },
      });
      expect(result.highlights[0].label).toBe("Updated");
      expect(result.highlights[0].color).toBe("blue");
    });

    it("leaves non-matching highlights unchanged", () => {
      const hl1 = makeHighlight("hl-1");
      const hl2 = makeHighlight("hl-2");
      const state = apply(
        createEmptyProject(),
        { type: "ADD_HIGHLIGHT", highlight: hl1 },
        { type: "ADD_HIGHLIGHT", highlight: hl2 },
      );
      const result = apply(state, {
        type: "UPDATE_HIGHLIGHT",
        id: "hl-1",
        patch: { label: "Updated" },
      });
      expect(result.highlights[0].label).toBe("Updated");
      expect(result.highlights[1].label).toBe("Highlight hl-2");
      expect(result.highlights[1]).toEqual(hl2);
    });
  });

  describe("DELETE_HIGHLIGHT", () => {
    it("removes the highlight", () => {
      const hl = makeHighlight("hl-1");
      const state = apply(createEmptyProject(), {
        type: "ADD_HIGHLIGHT",
        highlight: hl,
      });
      const result = apply(state, { type: "DELETE_HIGHLIGHT", id: "hl-1" });
      expect(result.highlights).toHaveLength(0);
    });

    it("clears highlightRef on waypoints that referenced it", () => {
      const hl = makeHighlight("hl-1");
      const wp = makeWaypoint({ highlightRef: "hl-1" });
      const state = apply(
        createEmptyProject(),
        { type: "ADD_HIGHLIGHT", highlight: hl },
        { type: "ADD_WAYPOINT", waypoint: wp },
      );
      const result = apply(state, { type: "DELETE_HIGHLIGHT", id: "hl-1" });
      expect(result.waypoints[0].highlightRef).toBeNull();
    });

    it("does not affect waypoints referencing other highlights", () => {
      const hl1 = makeHighlight("hl-1");
      const hl2 = makeHighlight("hl-2");
      const wp = makeWaypoint({ highlightRef: "hl-2" });
      const state = apply(
        createEmptyProject(),
        { type: "ADD_HIGHLIGHT", highlight: hl1 },
        { type: "ADD_HIGHLIGHT", highlight: hl2 },
        { type: "ADD_WAYPOINT", waypoint: wp },
      );
      const result = apply(state, { type: "DELETE_HIGHLIGHT", id: "hl-1" });
      expect(result.waypoints[0].highlightRef).toBe("hl-2");
    });
  });
});
