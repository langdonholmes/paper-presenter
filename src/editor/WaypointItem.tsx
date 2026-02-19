import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Waypoint } from "../types";

interface Props {
  waypoint: Waypoint;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function WaypointItem({
  waypoint,
  index,
  selected,
  onSelect,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: waypoint.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`waypoint-item${selected ? " selected" : ""}`}
      onClick={onSelect}
    >
      <span className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </span>
      <span className="wp-index">{index + 1}</span>
      <span className="wp-title">{waypoint.title || "Untitled"}</span>
      <button
        className="wp-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete waypoint"
      >
        ×
      </button>
    </div>
  );
}
