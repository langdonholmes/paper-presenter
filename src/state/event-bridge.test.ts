import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

import { emitTo, listen } from "@tauri-apps/api/event";
import {
  emitProjectUpdated,
  emitNavigateToWaypoint,
  emitWaypointChanged,
  emitPresenterState,
  onProjectUpdated,
  onNavigateToWaypoint,
  onWaypointChanged,
  onPresenterState,
} from "./event-bridge";
import { EVENTS } from "../types";
import type {
  ProjectUpdatedEvent,
  NavigateToWaypointEvent,
  WaypointChangedEvent,
  PresenterStateEvent,
} from "../types";
import { createEmptyProject, createEmptyWaypoint } from "./project-reducer";

const mockEmitTo = vi.mocked(emitTo);
const mockListen = vi.mocked(listen);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("emitters", () => {
  it("emitProjectUpdated sends to presenter with correct event and payload", async () => {
    const payload: ProjectUpdatedEvent = {
      project: createEmptyProject(),
      pdfUrl: "asset://test.pdf",
    };
    await emitProjectUpdated(payload);
    expect(mockEmitTo).toHaveBeenCalledWith("presenter", EVENTS.PROJECT_UPDATED, payload);
  });

  it("emitNavigateToWaypoint sends to presenter", async () => {
    const wp = createEmptyWaypoint();
    const payload: NavigateToWaypointEvent = { index: 2, waypoint: wp };
    await emitNavigateToWaypoint(payload);
    expect(mockEmitTo).toHaveBeenCalledWith("presenter", EVENTS.NAVIGATE_TO_WAYPOINT, payload);
  });

  it("emitWaypointChanged sends to presenter", async () => {
    const wp = createEmptyWaypoint();
    const payload: WaypointChangedEvent = { index: 0, waypoint: wp };
    await emitWaypointChanged(payload);
    expect(mockEmitTo).toHaveBeenCalledWith("presenter", EVENTS.WAYPOINT_CHANGED, payload);
  });

  it("emitPresenterState sends to editor", async () => {
    const payload: PresenterStateEvent = { currentIndex: 1, total: 5, isPresenting: true };
    await emitPresenterState(payload);
    expect(mockEmitTo).toHaveBeenCalledWith("editor", EVENTS.PRESENTER_STATE, payload);
  });
});

describe("listeners", () => {
  it("onProjectUpdated listens for project-updated and unwraps payload", async () => {
    const handler = vi.fn();
    const mockPayload: ProjectUpdatedEvent = {
      project: createEmptyProject(),
      pdfUrl: null,
    };

    mockListen.mockImplementation(async (_event, cb) => {
      (cb as (event: { payload: ProjectUpdatedEvent }) => void)({ payload: mockPayload });
      return () => {};
    });

    await onProjectUpdated(handler);
    expect(mockListen).toHaveBeenCalledWith(EVENTS.PROJECT_UPDATED, expect.any(Function));
    expect(handler).toHaveBeenCalledWith(mockPayload);
  });

  it("onNavigateToWaypoint listens and unwraps", async () => {
    const handler = vi.fn();
    const wp = createEmptyWaypoint();
    const mockPayload: NavigateToWaypointEvent = { index: 3, waypoint: wp };

    mockListen.mockImplementation(async (_event, cb) => {
      (cb as (event: { payload: NavigateToWaypointEvent }) => void)({ payload: mockPayload });
      return () => {};
    });

    await onNavigateToWaypoint(handler);
    expect(handler).toHaveBeenCalledWith(mockPayload);
  });

  it("onWaypointChanged listens and unwraps", async () => {
    const handler = vi.fn();
    const wp = createEmptyWaypoint();
    const payload: WaypointChangedEvent = { index: 1, waypoint: wp };

    mockListen.mockImplementation(async (_event, cb) => {
      (cb as (event: { payload: WaypointChangedEvent }) => void)({ payload: payload });
      return () => {};
    });

    await onWaypointChanged(handler);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("onPresenterState listens and unwraps", async () => {
    const handler = vi.fn();
    const payload: PresenterStateEvent = { currentIndex: 0, total: 3, isPresenting: true };

    mockListen.mockImplementation(async (_event, cb) => {
      (cb as (event: { payload: PresenterStateEvent }) => void)({ payload: payload });
      return () => {};
    });

    await onPresenterState(handler);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("listeners return an unlisten function", async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const result = await onProjectUpdated(() => {});
    expect(result).toBe(unlisten);
  });
});
