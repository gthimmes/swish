import { describe, it, expect } from "vitest";
import { computeFlowMetrics, type FlowStage, type FlowItem, type FlowTransition } from "./flow";

const DAY = 86_400_000;
const now = new Date("2026-07-13T12:00:00").getTime();

const stages: FlowStage[] = [
  { id: "s-backlog", name: "Backlog", category: "BACKLOG" },
  { id: "s-prog", name: "In Progress", category: "IN_PROGRESS" },
  { id: "s-review", name: "In Review", category: "IN_PROGRESS" },
  { id: "s-done", name: "Done", category: "DONE" },
];

function tr(workItemId: string, toStageId: string, daysAgo: number, fromStageId: string | null = null): FlowTransition {
  return { workItemId, fromStageId, toStageId, createdAt: new Date(now - daysAgo * DAY) };
}

describe("computeFlowMetrics", () => {
  it("computes cycle-time median and 85th percentile over completed items", () => {
    const items: FlowItem[] = [
      { id: "A", key: "A", title: "A", stageId: "s-done" },
      { id: "B", key: "B", title: "B", stageId: "s-done" },
      { id: "C", key: "C", title: "C", stageId: "s-done" },
    ];
    const transitions: FlowTransition[] = [
      tr("A", "s-backlog", 15), tr("A", "s-prog", 10, "s-backlog"), tr("A", "s-done", 3, "s-prog"), // 7d
      tr("B", "s-backlog", 25), tr("B", "s-prog", 20, "s-backlog"), tr("B", "s-done", 15, "s-prog"), // 5d
      tr("C", "s-backlog", 12), tr("C", "s-prog", 8, "s-backlog"), tr("C", "s-done", 2, "s-prog"), // 6d
    ];
    const m = computeFlowMetrics(items, stages, transitions, now);
    expect(m.cycleTime.count).toBe(3);
    expect(m.cycleTime.medianDays).toBe(6); // sorted [5,6,7]
    expect(m.cycleTime.p85Days).toBe(7);
  });

  it("measures cycle time from the FIRST in-progress entry, not creation", () => {
    // Sits in Backlog 30d, then flows In Progress -> In Review -> Done in 4 days total.
    const items: FlowItem[] = [{ id: "X", key: "X", title: "X", stageId: "s-done" }];
    const transitions: FlowTransition[] = [
      tr("X", "s-backlog", 34),
      tr("X", "s-prog", 4, "s-backlog"),
      tr("X", "s-review", 2, "s-prog"),
      tr("X", "s-done", 0, "s-review"),
    ];
    const m = computeFlowMetrics(items, stages, transitions, now);
    expect(m.cycleTime.count).toBe(1);
    expect(m.cycleTime.medianDays).toBe(4);
  });

  it("rounds fractional cycle times to one decimal", () => {
    const items: FlowItem[] = [{ id: "F", key: "F", title: "F", stageId: "s-done" }];
    const transitions: FlowTransition[] = [
      tr("F", "s-prog", 10, "s-backlog"),
      { workItemId: "F", fromStageId: "s-prog", toStageId: "s-done", createdAt: new Date(now - 2.5 * DAY) },
    ];
    const m = computeFlowMetrics(items, stages, transitions, now);
    expect(m.cycleTime.medianDays).toBe(7.5);
  });

  it("lists WIP items by time in their current stage, oldest first, and excludes done/backlog", () => {
    const items: FlowItem[] = [
      { id: "P1", key: "P1", title: "young", stageId: "s-prog" },
      { id: "P2", key: "P2", title: "old", stageId: "s-review" },
      { id: "D1", key: "D1", title: "done", stageId: "s-done" },
      { id: "B1", key: "B1", title: "backlog", stageId: "s-backlog" },
    ];
    const transitions: FlowTransition[] = [
      tr("P1", "s-backlog", 12), tr("P1", "s-prog", 3, "s-backlog"), // age 3
      tr("P2", "s-backlog", 20), tr("P2", "s-prog", 15, "s-backlog"), tr("P2", "s-review", 9, "s-prog"), // age 9
      tr("D1", "s-done", 1),
      tr("B1", "s-backlog", 5),
    ];
    const m = computeFlowMetrics(items, stages, transitions, now);
    expect(m.wip.count).toBe(2);
    expect(m.wip.items.map((w) => w.key)).toEqual(["P2", "P1"]); // oldest first
    expect(m.wip.items[0].ageDays).toBe(9);
    expect(m.wip.items[0].stage).toBe("In Review");
    expect(m.wip.items[1].ageDays).toBe(3);
  });

  it("buckets throughput by week and sums to the total", () => {
    const items: FlowItem[] = [
      { id: "A", key: "A", title: "A", stageId: "s-done" },
      { id: "B", key: "B", title: "B", stageId: "s-done" },
      { id: "C", key: "C", title: "C", stageId: "s-done" },
    ];
    const transitions: FlowTransition[] = [
      tr("A", "s-done", 2, "s-prog"),
      tr("B", "s-done", 9, "s-prog"),
      tr("C", "s-done", 16, "s-prog"),
    ];
    const m = computeFlowMetrics(items, stages, transitions, now, 8);
    expect(m.throughput.weeks).toHaveLength(8);
    const summed = m.throughput.weeks.reduce((n, w) => n + w.count, 0);
    expect(summed).toBe(m.throughput.total);
    expect(m.throughput.total).toBe(3);
  });

  it("excludes completions older than the throughput window", () => {
    const items: FlowItem[] = [{ id: "Old", key: "Old", title: "Old", stageId: "s-done" }];
    const transitions: FlowTransition[] = [tr("Old", "s-done", 200, "s-prog")]; // way outside 8 weeks
    const m = computeFlowMetrics(items, stages, transitions, now, 8);
    expect(m.throughput.total).toBe(0);
    // But it still counts as a cycle-time sample if it had a start… here no start, so 0.
    expect(m.cycleTime.count).toBe(0);
  });

  it("handles empty input without throwing", () => {
    const m = computeFlowMetrics([], stages, [], now);
    expect(m.cycleTime).toEqual({ medianDays: null, p85Days: null, count: 0 });
    expect(m.wip).toEqual({ count: 0, items: [] });
    expect(m.throughput.total).toBe(0);
    expect(m.throughput.weeks.every((w) => w.count === 0)).toBe(true);
  });

  it("ignores items that started but never finished for cycle time", () => {
    const items: FlowItem[] = [{ id: "WIP", key: "WIP", title: "WIP", stageId: "s-prog" }];
    const transitions: FlowTransition[] = [tr("WIP", "s-prog", 5, "s-backlog")];
    const m = computeFlowMetrics(items, stages, transitions, now);
    expect(m.cycleTime.count).toBe(0);
    expect(m.wip.count).toBe(1);
  });
});
