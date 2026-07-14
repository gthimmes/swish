import { describe, it, expect } from "vitest";
import { computeLanes, itemInLane, containerId, parseContainerId, type Lane } from "./grouping";
import type { WorkItem, User, Project, CustomField } from "./types";

const users: User[] = [
  { id: "u1", name: "Mira", initials: "MP", color: "#111" },
  { id: "u2", name: "Dax", initials: "DO", color: "#222" },
];

function item(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "i1", key: "SWISH-1", title: "t", type: "STORY", priority: "MEDIUM",
    estimate: null, rank: 1, description: null, projectId: "p1", stageId: "s1",
    assigneeId: null, epicId: null, cycleId: null, startDate: null, dueDate: null,
    assignee: null, labels: [], epic: null, spec: null, blockedBy: [], fieldValues: [],
    createdAt: "", updatedAt: "", ...overrides,
  } as WorkItem;
}

const project = { id: "p1" } as unknown as Project;

describe("computeLanes", () => {
  it("returns a single unnamed lane for 'none'", () => {
    const lanes = computeLanes("none", [], users, project);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].key).toBe("all");
    expect(lanes[0].field).toBeUndefined();
  });

  it("groups by assignee with an Unassigned lane last", () => {
    const lanes = computeLanes("assignee", [], users, project);
    expect(lanes.map((l) => l.key)).toEqual(["u1", "u2", "none"]);
    expect(lanes.at(-1)!.label).toBe("Unassigned");
    expect(lanes.at(-1)!.value).toBeNull();
    expect(lanes[0].field).toBe("assigneeId");
  });

  it("groups by priority in priority order", () => {
    const lanes = computeLanes("priority", [], users, project);
    expect(lanes.map((l) => l.value)).toEqual(["URGENT", "HIGH", "MEDIUM", "LOW"]);
  });

  it("groups by type across all item types", () => {
    const lanes = computeLanes("type", [], users, project);
    expect(lanes.map((l) => l.value)).toEqual(["STORY", "TASK", "BUG", "SPIKE", "EPIC"]);
  });

  it("groups by epic using EPIC items plus a 'No epic' lane", () => {
    const items = [item({ id: "e1", type: "EPIC", title: "Epic One" }), item({ id: "x", type: "STORY" })];
    const lanes = computeLanes("epic", items, users, project);
    expect(lanes.map((l) => l.key)).toEqual(["e1", "none"]);
    expect(lanes[0].label).toBe("Epic One");
  });

  it("groups by a custom SELECT field, with a 'No <field>' lane", () => {
    const fields: CustomField[] = [
      { id: "f1", name: "Team", type: "SELECT", options: JSON.stringify(["FE", "BE"]) } as unknown as CustomField,
    ];
    const lanes = computeLanes("field:f1", [], users, project, fields);
    expect(lanes.map((l) => l.label)).toEqual(["FE", "BE", "No Team"]);
    expect(lanes.every((l) => l.customFieldId === "f1")).toBe(true);
    expect(lanes.at(-1)!.value).toBeNull();
  });

  it("returns a single lane if the custom field is unknown", () => {
    const lanes = computeLanes("field:missing", [], users, project, []);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].key).toBe("all");
  });
});

describe("itemInLane", () => {
  it("puts every item in the catch-all lane", () => {
    expect(itemInLane(item(), { key: "all", label: "" })).toBe(true);
  });

  it("matches by assignee, priority, type and epic", () => {
    expect(itemInLane(item({ assigneeId: "u1" }), { key: "u1", label: "", field: "assigneeId", value: "u1" })).toBe(true);
    expect(itemInLane(item({ assigneeId: "u2" }), { key: "u1", label: "", field: "assigneeId", value: "u1" })).toBe(false);
    expect(itemInLane(item({ priority: "LOW" }), { key: "LOW", label: "", field: "priority", value: "LOW" })).toBe(true);
    expect(itemInLane(item({ type: "BUG" }), { key: "BUG", label: "", field: "type", value: "BUG" })).toBe(true);
    expect(itemInLane(item({ epicId: "e1" }), { key: "e1", label: "", field: "epicId", value: "e1" })).toBe(true);
  });

  it("matches by custom field value, treating a missing value as null", () => {
    const withVal = item({ fieldValues: [{ id: "v1", fieldId: "f1", value: "FE" }] });
    const feLane: Lane = { key: "FE", label: "FE", customFieldId: "f1", value: "FE" };
    const noneLane: Lane = { key: "__none", label: "No Team", customFieldId: "f1", value: null };
    expect(itemInLane(withVal, feLane)).toBe(true);
    expect(itemInLane(withVal, noneLane)).toBe(false);
    expect(itemInLane(item(), noneLane)).toBe(true); // no value → the "none" lane
  });
});

describe("containerId round-trip", () => {
  it("encodes and decodes lane/stage ids", () => {
    const enc = containerId("laneA", "stage-1");
    expect(enc).toBe("laneA::stage-1");
    expect(parseContainerId(enc)).toEqual({ laneKey: "laneA", stageId: "stage-1" });
  });

  it("survives lane keys that themselves contain separators safely", () => {
    // parseContainerId splits on the FIRST "::" only.
    const { laneKey, stageId } = parseContainerId("all::stage::weird");
    expect(laneKey).toBe("all");
    expect(stageId).toBe("stage::weird");
  });
});
