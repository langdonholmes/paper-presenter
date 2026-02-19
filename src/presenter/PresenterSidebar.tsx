import type { Waypoint } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  waypoint: Waypoint;
  width: string;
}

export default function PresenterSidebar({ waypoint, width }: Props) {
  return (
    <aside
      className="presenter-sidebar"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <h2 className="presenter-sidebar-title">{waypoint.title}</h2>
      {waypoint.content && (
        <MarkdownRenderer
          content={waypoint.content}
          className="presenter-sidebar-content"
        />
      )}
    </aside>
  );
}
