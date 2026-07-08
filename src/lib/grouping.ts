import type { GroupBy } from "./enums";
import { PRIORITY_META, PRIORITIES, ITEM_TYPES, TYPE_META } from "./enums";
import type { CustomField, Project, User, WorkItem } from "./types";

export type Lane = {
  key: string; // stable identity used in droppable ids and field updates
  label: string;
  color?: string;
  // the field/value a card must have to belong to this lane (for cross-lane drag)
  field?: "assigneeId" | "priority" | "type" | "epicId";
  value?: string | null;
  // for grouping by a custom field
  customFieldId?: string;
};

const NONE_LANE: Lane = { key: "all", label: "" };

const FIELD_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7", "#14b8a6", "#ef4444"];

/** Compute the ordered set of swimlanes for a board given the grouping mode. */
export function computeLanes(
  groupBy: string,
  items: WorkItem[],
  users: User[],
  project: Project | undefined,
  customFields: CustomField[] = []
): Lane[] {
  // Grouping by a custom SELECT field: "field:<id>"
  if (groupBy.startsWith("field:")) {
    const fieldId = groupBy.slice("field:".length);
    const field = customFields.find((f) => f.id === fieldId);
    if (!field) return [NONE_LANE];
    let options: string[] = [];
    try {
      options = JSON.parse(field.options);
    } catch {
      options = [];
    }
    const lanes: Lane[] = options.map((opt, i) => ({
      key: opt,
      label: opt,
      color: FIELD_COLORS[i % FIELD_COLORS.length],
      customFieldId: fieldId,
      value: opt,
    }));
    lanes.push({ key: "__none", label: `No ${field.name}`, customFieldId: fieldId, value: null });
    return lanes;
  }

  switch (groupBy as GroupBy) {
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
  if (lane.customFieldId) {
    const fv = item.fieldValues?.find((v) => v.fieldId === lane.customFieldId);
    const current = fv?.value ?? null;
    return current === lane.value;
  }
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
