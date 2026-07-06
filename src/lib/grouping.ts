import type { GroupBy } from "./enums";
import { PRIORITY_META, PRIORITIES, ITEM_TYPES, TYPE_META } from "./enums";
import type { Project, User, WorkItem } from "./types";

export type Lane = {
  key: string; // stable identity used in droppable ids and field updates
  label: string;
  color?: string;
  // the field/value a card must have to belong to this lane (for cross-lane drag)
  field?: "assigneeId" | "priority" | "type" | "epicId";
  value?: string | null;
};

const NONE_LANE: Lane = { key: "all", label: "" };

/** Compute the ordered set of swimlanes for a board given the grouping mode. */
export function computeLanes(
  groupBy: GroupBy,
  items: WorkItem[],
  users: User[],
  project: Project | undefined
): Lane[] {
  switch (groupBy) {
    case "assignee": {
      const lanes: Lane[] = users.map((u) => ({
        key: u.id,
        label: u.name,
        color: u.color,
        field: "assigneeId",
        value: u.id,
      }));
      lanes.push({ key: "none", label: "Unassigned", field: "assigneeId", value: null });
      return lanes;
    }
    case "priority":
      return PRIORITIES.map((p) => ({
        key: p,
        label: PRIORITY_META[p].label,
        color: PRIORITY_META[p].color,
        field: "priority",
        value: p,
      }));
    case "type":
      return ITEM_TYPES.map((t) => ({
        key: t,
        label: TYPE_META[t].label,
        color: TYPE_META[t].color,
        field: "type",
        value: t,
      }));
    case "epic": {
      const epics = items.filter((i) => i.type === "EPIC");
      const lanes: Lane[] = epics.map((e) => ({
        key: e.id,
        label: e.title,
        color: "#f59e0b",
        field: "epicId",
        value: e.id,
      }));
      lanes.push({ key: "none", label: "No epic", field: "epicId", value: null });
      return lanes;
    }
    case "none":
    default:
      return [NONE_LANE];
  }
}

/** Does an item belong in this lane? */
export function itemInLane(item: WorkItem, lane: Lane): boolean {
  if (!lane.field) return true;
  switch (lane.field) {
    case "assigneeId":
      return item.assigneeId === lane.value;
    case "priority":
      return item.priority === lane.value;
    case "type":
      return item.type === lane.value;
    case "epicId":
      return item.epicId === lane.value;
  }
}

/** Encode/decode a droppable container id as `${laneKey}::${stageId}`. */
export function containerId(laneKey: string, stageId: string) {
  return `${laneKey}::${stageId}`;
}
export function parseContainerId(id: string): { laneKey: string; stageId: string } {
  const idx = id.indexOf("::");
  return { laneKey: id.slice(0, idx), stageId: id.slice(idx + 2) };
}
