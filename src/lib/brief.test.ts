import { describe, it, expect } from "vitest";
import { buildAgentBrief, buildPrDraft } from "./brief";
import type { WorkItemDetail } from "./types";

function makeItem(overrides: Partial<WorkItemDetail> = {}): WorkItemDetail {
  const base = {
    id: "i1",
    key: "SWISH-42",
    title: "Do the thing",
    type: "STORY",
    priority: "HIGH",
    estimate: 5,
    rank: 1000,
    description: "A short description.",
    projectId: "p1",
    stageId: "s1",
    assigneeId: "u1",
    epicId: null,
    cycleId: null,
    startDate: "2026-07-01",
    dueDate: "2026-07-10",
    assignee: { id: "u1", name: "Mira Patel", initials: "MP", color: "#000" },
    labels: [{ id: "l1", name: "frontend", color: "#3b82f6" }],
    epic: { id: "e1", key: "SWISH-1", title: "Platform" },
    stage: { id: "s1", name: "In Progress", color: "#3b82f6", category: "IN_PROGRESS", order: 3, wipLimit: null },
    children: [],
    blocks: [],
    blockedBy: [],
    fieldValues: [],
    activity: [],
    spec: {
      id: "sp1",
      status: "APPROVED",
      problem: "Users cannot do the thing.",
      goals: "Let users do the thing.",
      nonGoals: "Not the other thing.",
      approach: "Build a thing-doer.",
      risks: "Thing might break.",
      criteria: [
        { id: "c1", text: "Thing is done", done: true, order: 0 },
        { id: "c2", text: "Thing is tested", done: false, order: 1 },
      ],
      tests: [
        { id: "t1", text: "E2E does the thing", status: "PASS", order: 0 },
        { id: "t2", text: "Edge case", status: "TODO", order: 1 },
      ],
    },
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01",
  } as unknown as WorkItemDetail;
  return { ...base, ...overrides };
}

describe("buildAgentBrief", () => {
  it("includes the header, metadata and every spec section", () => {
    const md = buildAgentBrief(makeItem());
    expect(md).toContain("# SWISH-42: Do the thing");
    expect(md).toContain("**Type:** STORY");
    expect(md).toContain("**Assignee:** Mira Patel");
    expect(md).toContain("**Epic:** Platform");
    expect(md).toContain("## Problem & Context");
    expect(md).toContain("## Goals");
    expect(md).toContain("## Non-Goals");
    expect(md).toContain("## Technical Approach");
    expect(md).toContain("## Risks & Open Questions");
  });

  it("renders criteria and tests with checkbox / status markers", () => {
    const md = buildAgentBrief(makeItem());
    expect(md).toContain("- [x] Thing is done");
    expect(md).toContain("- [ ] Thing is tested");
    expect(md).toContain("- (PASS) E2E does the thing");
    expect(md).toContain("- (TODO) Edge case");
  });

  it("falls back gracefully when there is no spec", () => {
    const md = buildAgentBrief(makeItem({ spec: null }));
    expect(md).toContain("# SWISH-42:");
    expect(md).toContain("No structured spec yet");
    expect(md).not.toContain("## Problem & Context");
  });

  it("omits empty spec sections", () => {
    const item = makeItem();
    item.spec!.risks = "";
    const md = buildAgentBrief(item);
    expect(md).not.toContain("## Risks & Open Questions");
  });
});

describe("buildPrDraft", () => {
  it("produces a suggested title, summary, and Closes reference", () => {
    const md = buildPrDraft(makeItem());
    expect(md).toContain("### Suggested title");
    expect(md).toContain("SWISH-42: Do the thing");
    expect(md).toContain("## Summary");
    expect(md).toContain("**Goals:** Let users do the thing.");
    expect(md).toContain("## Implementation notes");
    expect(md).toContain("Closes SWISH-42");
    expect(md).toContain("Epic: Platform");
  });

  it("renders acceptance criteria and test plan as checklists (checked when done/passing)", () => {
    const md = buildPrDraft(makeItem());
    expect(md).toContain("- [x] Thing is done");
    expect(md).toContain("- [ ] Thing is tested");
    // A passing test is checked; a TODO test is unchecked and annotated.
    expect(md).toContain("- [x] E2E does the thing");
    expect(md).toContain("- [ ] Edge case _(TODO)_");
  });

  it("degrades to placeholders when the spec is missing", () => {
    const md = buildPrDraft(makeItem({ spec: null, description: null }));
    expect(md).toContain("_Describe what this PR does._");
    expect(md).toContain("_No acceptance criteria specified._");
    expect(md).toContain("_No test plan specified._");
    expect(md).toContain("Closes SWISH-42");
  });

  it("marks a FAILing test unchecked with its status", () => {
    const item = makeItem();
    item.spec!.tests = [{ id: "t1", text: "flaky", status: "FAIL", order: 0 }];
    const md = buildPrDraft(item);
    expect(md).toContain("- [ ] flaky _(FAIL)_");
  });
});
