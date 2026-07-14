import { describe, it, expect } from "vitest";
import {
  ITEM_TYPES, PRIORITIES, SPEC_STATUSES, TEST_STATUSES, GROUP_BY, FIELD_TYPES, STAGE_CATEGORIES,
  TYPE_META, PRIORITY_META, SPEC_STATUS_META, CATEGORY_META, FIELD_TYPE_META,
} from "./enums";

describe("enum metadata completeness", () => {
  it("every item type has display metadata", () => {
    for (const t of ITEM_TYPES) {
      expect(TYPE_META[t]).toBeDefined();
      expect(TYPE_META[t].label).toBeTruthy();
      expect(TYPE_META[t].color).toMatch(/^#/);
    }
  });

  it("every priority has metadata with a unique ordering weight", () => {
    const weights = PRIORITIES.map((p) => PRIORITY_META[p].weight);
    expect(weights).toEqual([...weights].sort((a, b) => a - b)); // already in ascending order
    expect(new Set(weights).size).toBe(PRIORITIES.length); // unique
  });

  it("every spec status and stage category has metadata", () => {
    for (const s of SPEC_STATUSES) expect(SPEC_STATUS_META[s].label).toBeTruthy();
    for (const c of STAGE_CATEGORIES) expect(CATEGORY_META[c].label).toBeTruthy();
  });

  it("every field type has a label", () => {
    for (const f of FIELD_TYPES) expect(FIELD_TYPE_META[f].label).toBeTruthy();
  });

  it("exposes the expected enum members", () => {
    expect(ITEM_TYPES).toContain("EPIC");
    expect(PRIORITIES).toContain("URGENT");
    expect(TEST_STATUSES).toEqual(["TODO", "PASS", "FAIL"]);
    expect(GROUP_BY).toContain("assignee");
    expect(GROUP_BY[0]).toBe("none");
  });
});
