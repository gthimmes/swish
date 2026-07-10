// Flow metrics computed from timestamped stage-transition history:
// cycle time (how long work takes), WIP aging (what's getting stale), and
// throughput (how much completes per week). Pure and deterministic — `now`
// is passed in so the same input always yields the same output.

const DAY = 86_400_000;

export type FlowStage = { id: string; name: string; category: string };
export type FlowItem = { id: string; key: string; title: string; stageId: string };
export type FlowTransition = { workItemId: string; fromStageId: string | null; toStageId: string; createdAt: string | Date };

export type FlowMetrics = {
  cycleTime: { medianDays: number | null; p85Days: number | null; count: number };
  wip: { count: number; items: { key: string; title: string; stage: string; ageDays: number }[] };
  throughput: { weeks: { label: string; count: number }[]; total: number };
};

function ms(d: string | Date): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Monday 00:00 of the week containing `t`, in local time. */
function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export function computeFlowMetrics(
  items: FlowItem[],
  stages: FlowStage[],
  transitions: FlowTransition[],
  now: number,
  weeksBack = 8
): FlowMetrics {
  const catOf = new Map(stages.map((s) => [s.id, s.category]));
  const nameOf = new Map(stages.map((s) => [s.id, s.name]));

  // Group transitions per item, chronological.
  const byItem = new Map<string, FlowTransition[]>();
  for (const t of transitions) {
    const arr = byItem.get(t.workItemId) ?? [];
    arr.push(t);
    byItem.set(t.workItemId, arr);
  }
  for (const arr of byItem.values()) arr.sort((a, b) => ms(a.createdAt) - ms(b.createdAt));

  // --- Cycle time: first entry into an IN_PROGRESS stage → first entry into DONE ---
  const cycleSamples: number[] = [];
  for (const item of items) {
    const trs = byItem.get(item.id);
    if (!trs) continue;
    const startedAt = trs.find((t) => catOf.get(t.toStageId) === "IN_PROGRESS");
    if (!startedAt) continue;
    const doneAt = trs.find((t) => catOf.get(t.toStageId) === "DONE" && ms(t.createdAt) >= ms(startedAt.createdAt));
    if (!doneAt) continue;
    cycleSamples.push((ms(doneAt.createdAt) - ms(startedAt.createdAt)) / DAY);
  }
  cycleSamples.sort((a, b) => a - b);
  const median = percentile(cycleSamples, 50);
  const p85 = percentile(cycleSamples, 85);

  // --- WIP aging: items currently in an IN_PROGRESS stage, by time in current stage ---
  const wipItems: { key: string; title: string; stage: string; ageDays: number }[] = [];
  for (const item of items) {
    if (catOf.get(item.stageId) !== "IN_PROGRESS") continue;
    const trs = byItem.get(item.id) ?? [];
    // latest transition INTO the current stage marks when it entered.
    let enteredAt = 0;
    for (const t of trs) if (t.toStageId === item.stageId) enteredAt = Math.max(enteredAt, ms(t.createdAt));
    const ageDays = enteredAt ? (now - enteredAt) / DAY : 0;
    wipItems.push({ key: item.key, title: item.title, stage: nameOf.get(item.stageId) ?? "", ageDays: round1(ageDays) });
  }
  wipItems.sort((a, b) => b.ageDays - a.ageDays);

  // --- Throughput: distinct items reaching DONE per week, last `weeksBack` weeks ---
  const thisWeek = weekStart(now);
  const buckets: { start: number; label: string; count: number }[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = thisWeek - i * 7 * DAY;
    const d = new Date(start);
    buckets.push({ start, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 });
  }
  const earliest = buckets[0].start;
  const countedDone = new Set<string>();
  for (const item of items) {
    const trs = byItem.get(item.id);
    if (!trs) continue;
    const doneAt = trs.find((t) => catOf.get(t.toStageId) === "DONE");
    if (!doneAt) continue;
    const t = ms(doneAt.createdAt);
    if (t < earliest || t > thisWeek + 7 * DAY) continue;
    const ws = weekStart(t);
    const bucket = buckets.find((b) => b.start === ws);
    if (bucket && !countedDone.has(item.id)) {
      bucket.count++;
      countedDone.add(item.id);
    }
  }

  return {
    cycleTime: { medianDays: median != null ? round1(median) : null, p85Days: p85 != null ? round1(p85) : null, count: cycleSamples.length },
    wip: { count: wipItems.length, items: wipItems },
    throughput: { weeks: buckets.map((b) => ({ label: b.label, count: b.count })), total: countedDone.size },
  };
}
