import type { ScaledPosition } from "react-pdf-highlighter-extended";

export const HL_PALETTE = {
  yellow: "250, 204, 21",
  gold: "250, 204, 21",
  blue: "137, 180, 250",
  green: "166, 227, 161",
  pink: "245, 194, 231",
  orange: "250, 179, 135",
  purple: "203, 166, 247",
  red: "243, 139, 168",
  teal: "148, 226, 213",
} as const;

export type HighlightColor = keyof typeof HL_PALETTE;
export const HL_DEFAULT_COLOR: HighlightColor = "yellow";

export interface PdfHighlight {
  id: string;
  label: string;
  position: ScaledPosition;
  content: { text?: string; image?: string };
  color: HighlightColor;
}

export type ScrollAlign = "top" | "center" | "bottom";

export interface Waypoint {
  id: string;
  title: string;
  content: string;
  notes: string;
  page: number | null;
  scrollY: number | null;
  highlightRef: string | null;
  color: HighlightColor | null;
  sidebarWidth: string;
  sidebar: boolean;
  scrollAlign: ScrollAlign;
}

export interface ProjectMeta {
  title: string;
  defaults: {
    sidebarWidth: string;
    sidebar: boolean;
  };
}

export interface ProjectFile {
  version: 1;
  meta: ProjectMeta;
  pdfPath: string;
  highlights: PdfHighlight[];
  waypoints: Waypoint[];
}
