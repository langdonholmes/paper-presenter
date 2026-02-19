import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useProject } from "../state/ProjectContext";
import { createEmptyWaypoint } from "../state/project-reducer";
import WaypointItem from "./WaypointItem";
import "../styles/waypoints.css";

export default function WaypointList() {
  const { project, dispatch, selectedWaypointIndex, setSelectedWaypointIndex } =
    useProject();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAdd = () => {
    const wp = createEmptyWaypoint();
    dispatch({ type: "ADD_WAYPOINT", waypoint: wp });
    setSelectedWaypointIndex(project.waypoints.length);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = project.waypoints.findIndex((w) => w.id === active.id);
    const toIndex = project.waypoints.findIndex((w) => w.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    dispatch({ type: "REORDER_WAYPOINTS", fromIndex, toIndex });
    setSelectedWaypointIndex(toIndex);
  };

  const handleDelete = (id: string, index: number) => {
    dispatch({ type: "DELETE_WAYPOINT", id });
    if (selectedWaypointIndex >= project.waypoints.length - 1) {
      setSelectedWaypointIndex(Math.max(0, project.waypoints.length - 2));
    } else if (index < selectedWaypointIndex) {
      setSelectedWaypointIndex(selectedWaypointIndex - 1);
    }
  };

  return (
    <>
      <div className="waypoint-list-header">
        <h3>Waypoints</h3>
        {project.waypoints.length > 0 && (
          <span className="wp-counter">
            {selectedWaypointIndex + 1} / {project.waypoints.length}
          </span>
        )}
        <button onClick={handleAdd}>+ Add</button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={project.waypoints.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="waypoint-list-items">
            {project.waypoints.length === 0 && (
              <div className="waypoint-list-empty">
                No waypoints yet.<br />
                Click <strong>+ Add</strong> to create one.
              </div>
            )}
            {project.waypoints.map((wp, i) => (
              <WaypointItem
                key={wp.id}
                waypoint={wp}
                index={i}
                selected={i === selectedWaypointIndex}
                onSelect={() => setSelectedWaypointIndex(i)}
                onDelete={() => handleDelete(wp.id, i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}
