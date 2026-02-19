import type { ProjectFile, Waypoint } from "./project";

export const EVENTS = {
  PROJECT_UPDATED: "project-updated",
  NAVIGATE_TO_WAYPOINT: "navigate-to-waypoint",
  WAYPOINT_CHANGED: "waypoint-changed",
  PRESENTER_STATE: "presenter-state",
} as const;

export interface ProjectUpdatedEvent {
  project: ProjectFile;
  pdfUrl: string | null;
}

export interface NavigateToWaypointEvent {
  index: number;
  waypoint: Waypoint;
}

export interface WaypointChangedEvent {
  index: number;
  waypoint: Waypoint;
}

export interface PresenterStateEvent {
  currentIndex: number;
  total: number;
  isPresenting: boolean;
}
