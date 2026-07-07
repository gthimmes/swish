"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/components/workspace";
import { useItems } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { TypeBadge } from "@/components/ui";
import { PRIORITY_META } from "@/lib/enums";
import { fmtDate } from "@/lib/dates";
import type { WorkItem } from "@/lib/types";

const DAY = 86_400_000;

export default function TimelinePage() {
  const { project, openItem } = useWorkspace();
  const { data: items } = useItems(project?.id);

  const stages = useMemo(() => project?.stages ?? [], [project]);
  const doneStageIds = useMemo(
    () => new Set(stages.filter((s) => s.category === "DONE").map((s) => s.id)),
    [stages]
  );
  const stageColor = useMemo(() => new Map(stages.map((s) => [s.id, s.color])), [stages]);

  const model = useMemo(() => {
    const scheduled = (items ?? []).filter((i) => i.startDate || i.dueDate);
    if (scheduled.length === 0) return null;

    const times: number[] = [];
    for (const i of scheduled) {
      if (i.startDate) times.push(new Date(i.startDate).getTime());
      if (i.dueDate) times.push(new Date(i.dueDate).getTime());
    }
    const min = Math.min(...times) - 3 * DAY;
    const max = Math.max(...times) + 3 * DAY;
    const total = Math.max(max - min, DAY);

    // group scheduled items by epic
    const byEpic = new Map<string, WorkItem[]>();
    const epicMeta = new Map<string, WorkItem>();
    (items ?? []).forEach((i) => {
      if (i.type === "EPIC") epicMeta.set(i.id, i);
    });
    const ungrouped: WorkItem[] = [];
    for (const i of scheduled) {
      if (i.type === "EPIC") continue;
      if (i.epicId) {
        const arr = byEpic.get(i.epicId) ?? [];
        arr.push(i);
        byEpic.set(i.epicId, arr);
      } else ungrouped.push(i);
    }

    const groups: { key: string; label: string; items: WorkItem[] }[] = [];
    const orderedEpics = [...epicMeta.values()].sort(
      (a, b) => PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight || a.rank - b.rank
    );
    for (const e of orderedEpics) {
      const its = byEpic.get(e.id);
      if (its && its.length) groups.push({ key: e.id, label: e.title, items: its });
    }
    if (ungrouped.length) groups.push({ key: "none", label: "Standalone", items: ungrouped });

    // month ticks
    const months: { left: number; label: string }[] = [];
    const start = new Date(min);
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d.getTime() <= max) {
      const left = ((d.getTime() - min) / total) * 100;
      if (left >= 0) months.push({ left, label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }

    const nowLeft = ((Date.now() - min) / total) * 100;

    return { groups, min, total, months, nowLeft };
  }, [items]);

  function pct(ms: number) {
    if (!model) return 0;
    return Math.max(0, Math.min(100, ((ms - model.min) / model.total) * 100));
  }

  return (
    <>
      <PageHeader title="Timeline" />
      <div className="flex-1 overflow-auto p-4">
        {!model ? (
          <div className="p-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
            No scheduled work yet. Add start/due dates to items to see them here.
          </div>
        ) : (
          <div className="min-w-[720px]">
            {/* Axis */}
            <div className="relative mb-2 ml-56 h-5" data-testid="timeline-axis">
              {model.months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-[11px]"
                  style={{ left: `${m.left}%`, color: "var(--text-faint)", transform: "translateX(-50%)" }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="relative">
              {/* Today line spanning all rows */}
              {model.nowLeft >= 0 && model.nowLeft <= 100 && (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-10"
                  style={{ left: `calc(14rem + ${model.nowLeft}% * (100% - 14rem) / 100)` }}
                  data-testid="timeline-today"
                >
                  <div className="h-full w-px" style={{ background: "#ef4444aa" }} />
                </div>
              )}

              <div className="flex flex-col gap-4">
                {model.groups.map((g) => (
                  <section key={g.key} data-testid="timeline-group" data-label={g.label}>
                    <div className="mb-1.5 text-sm font-semibold">{g.label}</div>
                    <div className="flex flex-col gap-1">
                      {g.items.map((it) => {
                        const done = doneStageIds.has(it.stageId);
                        const blocked = (it.blockedBy ?? []).some((d) => d.blocker.stage.category !== "DONE");
                        const startMs = it.startDate ? new Date(it.startDate).getTime() : new Date(it.dueDate!).getTime();
                        const endMs = it.dueDate ? new Date(it.dueDate).getTime() : new Date(it.startDate!).getTime();
                        const overdue = !done && it.dueDate ? new Date(it.dueDate).getTime() < Date.now() : false;
                        const left = pct(startMs);
                        const width = Math.max(1.5, pct(endMs) - left);
                        const color = done ? "#22c55e" : overdue ? "#ef4444" : stageColor.get(it.stageId) ?? "#3b82f6";
                        return (
                          <div key={it.id} className="flex items-center" data-testid="timeline-row" data-key={it.key}>
                            <button
                              className="flex w-56 shrink-0 items-center gap-1.5 truncate pr-2 text-left text-xs hover:underline"
                              onClick={() => openItem(it.id)}
                            >
                              <TypeBadge type={it.type} />
                              {blocked && <span title="Blocked" style={{ color: "#ef4444" }}>⛔</span>}
                              <span className="truncate">{it.title}</span>
                            </button>
                            <div className="relative h-6 flex-1">
                              <button
                                className="absolute top-1 h-4 rounded"
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  background: color,
                                  outline: blocked ? "1.5px solid #ef4444" : "none",
                                  outlineOffset: 1,
                                }}
                                title={`${it.key}: ${fmtDate(it.startDate)}${it.startDate && it.dueDate ? " → " : ""}${fmtDate(it.dueDate)}`}
                                data-testid="timeline-bar"
                                data-overdue={overdue}
                                data-blocked={blocked}
                                onClick={() => openItem(it.id)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
