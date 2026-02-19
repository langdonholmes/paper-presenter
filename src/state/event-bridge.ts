import { emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  EVENTS,
  type ProjectUpdatedEvent,
  type NavigateToWaypointEvent,
  type WaypointChangedEvent,
  type PresenterStateEvent,
} from "../types";

// ── Emitters (editor → presenter) ──

export function emitProjectUpdated(payload: ProjectUpdatedEvent) {
  return emitTo("presenter", EVENTS.PROJECT_UPDATED, payload);
}

export function emitNavigateToWaypoint(payload: NavigateToWaypointEvent) {
  return emitTo("presenter", EVENTS.NAVIGATE_TO_WAYPOINT, payload);
}

export function emitWaypointChanged(payload: WaypointChangedEvent) {
  return emitTo("presenter", EVENTS.WAYPOINT_CHANGED, payload);
}

// ── Listeners ──

export function onProjectUpdated(
  handler: (payload: ProjectUpdatedEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProjectUpdatedEvent>(EVENTS.PROJECT_UPDATED, (e) =>
    handler(e.payload),
  );
}

export function onNavigateToWaypoint(
  handler: (payload: NavigateToWaypointEvent) => void,
): Promise<UnlistenFn> {
  return listen<NavigateToWaypointEvent>(EVENTS.NAVIGATE_TO_WAYPOINT, (e) =>
    handler(e.payload),
  );
}

export function onWaypointChanged(
  handler: (payload: WaypointChangedEvent) => void,
): Promise<UnlistenFn> {
  return listen<WaypointChangedEvent>(EVENTS.WAYPOINT_CHANGED, (e) =>
    handler(e.payload),
  );
}

export function onPresenterState(
  handler: (payload: PresenterStateEvent) => void,
): Promise<UnlistenFn> {
  return listen<PresenterStateEvent>(EVENTS.PRESENTER_STATE, (e) =>
    handler(e.payload),
  );
}
