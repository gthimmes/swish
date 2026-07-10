"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/components/workspace";
import { useItems, fetcher } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { PRIORITIES, PRIORITY_META, ITEM_TYPES, TYPE_META } from "@/lib/enums";
import type { WorkItem } from "@/lib/types";
import type { FlowMetrics } from "@/lib/flow";

export default function InsightsPage() {
  const { project } = useWorkspace();
  const { data: items } = useItems(project?.id);

  const stages = useMemo(
    () => [...(project?.stages ?? [])].sort((a, b) => a.order - b.order),
    [project]
  );

  const m = useMemo(() => computeMetrics(items ?? [], stages), [items, stages]);
  const { data: flow } = useSWR<FlowMetrics>(project ? `/api/projects/${project.id}/flow` : null, fetcher);

  return (
    <>
      <PageHeader title="Insights">
        <span className="text-sm" style={{ color: "var(--text-dim)" }}>
          {m.total} items
        </span>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="stat-tiles">
            <Stat label="Total" value={m.total} testid="stat-total" />
            <Stat label="Done" value={m.done} sub={`${m.donePct}%`} accent="#22c55e" testid="stat-done" />
            <Stat label="In progress" value={m.inProgress} accent="#3b82f6" testid="stat-inprogress" />
            <Stat label="Backlog" value={m.backlog} accent="#64748b" testid="stat-backlog" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Items by stage" testid="chart-stage">
              <BarList rows={m.byStage} />
            </Panel>

            <Panel title="Spec coverage" testid="chart-spec">
              <div className="flex items-center gap-5">
                <Donut percent={m.specCoveragePct} color="#a855f7" />
                <div className="flex flex-col gap-1 text-sm">
                  <Legend color="#a855f7" label={`${m.storiesWithSpec}/${m.stories} stories have a spec`} />
                  <Legend color="#22c55e" label={`${m.approved} approved`} />
                  <Legend color="#eab308" label={`${m.inReview} in review`} />
                  <Legend color="#64748b" label={`${m.draft} draft`} />
                </div>
              </div>
            </Panel>

            <Panel title="Items by type" testid="chart-type">
              <BarList rows={m.byType} />
            </Panel>

            <Panel title="Items by priority" testid="chart-priority">
              <BarList rows={m.byPriority} />
            </Panel>

            <Panel title="Estimate points" testid="chart-points">
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{m.pointsDone}</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                  of {m.pointsTotal} points done
                </span>
              </div>
              <Progress percent={m.pointsPct} color="#22c55e" />
            </Panel>

            <Panel title="WIP vs limits" testid="chart-wip">
              {m.wip.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                  No WIP limits set. Add them in Workflow settings.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {m.wip.map((w) => (
                    <li key={w.name} className="flex items-center gap-2 text-sm" data-testid="wip-row">
                      <span className="w-28 truncate" style={{ color: "var(--text-dim)" }}>
                        {w.name}
                      </span>
                      <div className="flex-1">
                        <Progress percent={Math.min(100, (w.count / w.limit) * 100)} color={w.over ? "#ef4444" : "#3b82f6"} />
                      </div>
                      <span className="w-10 text-right tabular-nums" style={{ color: w.over ? "#ef4444" : "var(--text-dim)" }}>
                        {w.count}/{w.limit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Flow metrics — derived from stage-transition history */}
          {flow && (
            <>
              <h2 className="mt-2 text-sm font-semibold" style={{ color: "var(--text-dim)" }} data-testid="flow-heading">
                Flow
              </h2>
              <div className="grid gap-4 md:grid-cols-2" data-testid="flow-section">
                <Panel title="Cycle time" testid="chart-cycletime">
                  {flow.cycleTime.count === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                      No completed work yet — cycle time appears once items reach Done.
                    </p>
                  ) : (
                    <div className="flex items-end gap-6">
                      <div>
                        <div className="text-3xl font-semibold tabular-nums" data-testid="cycletime-median">
                          {flow.cycleTime.medianDays}
                          <span className="ml-1 text-sm font-normal" style={{ color: "var(--text-dim)" }}>
                            days median
                          </span>
                        </div>
                        <div className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                          85th percentile {flow.cycleTime.p85Days} days · {flow.cycleTime.count} items
                        </div>
                      </div>
                    </div>
                  )}
                </Panel>

                <Panel title="Throughput (items done / week)" testid="chart-throughput">
                  <ThroughputChart weeks={flow.throughput.weeks} />
                  <div className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                    {flow.throughput.total} completed in the last {flow.throughput.weeks.length} weeks
                  </div>
                </Panel>

                <Panel title={`WIP aging (${flow.wip.count} in progress)`} testid="chart-wipaging">
                  {flow.wip.items.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                      Nothing in progress right now.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {flow.wip.items.slice(0, 8).map((w) => (
                        <li key={w.key} className="flex items-center gap-2 text-sm" data-testid="wipaging-row">
                          <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                            {w.key}
                          </span>
                          <span className="truncate" style={{ maxWidth: 200 }}>
                            {w.title}
                          </span>
                          <span className="chip ml-auto" style={{ color: "var(--text-dim)" }}>
                            {w.stage}
                          </span>
                          <span
                            className="w-16 text-right tabular-nums"
                            style={{ color: w.ageDays >= 10 ? "#ef4444" : "var(--text-dim)" }}
                          >
                            {w.ageDays}d
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ThroughputChart({ weeks }: { weeks: { label: string; count: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <div className="flex items-end gap-2" style={{ height: 96 }}>
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1" data-testid="throughput-bar">
          <span className="text-[11px] tabular-nums" style={{ color: "var(--text-dim)" }}>
            {w.count}
          </span>
          <div className="flex w-full items-end" style={{ height: 60 }}>
            <div
              className="w-full rounded-t"
              style={{ height: `${(w.count / max) * 100}%`, minHeight: w.count ? 4 : 0, background: "#3b82f6" }}
            />
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
            {w.label}
          </span>
        </div>
      ))}
    </div>
  );
}

type Row = { label: string; value: number; color: string };

function computeMetrics(items: WorkItem[], stages: { id: string; name: string; color: string; category: string; wipLimit: number | null }[]) {
  const catOf = new Map(stages.map((s) => [s.id, s.category]));
  const total = items.length;
  const done = items.filter((i) => catOf.get(i.stageId) === "DONE").length;
  const inProgress = items.filter((i) => catOf.get(i.stageId) === "IN_PROGRESS").length;
  const backlog = items.filter((i) => catOf.get(i.stageId) === "BACKLOG").length;

  const byStage: Row[] = stages.map((s) => ({
    label: s.name,
    value: items.filter((i) => i.stageId === s.id).length,
    color: s.color,
  }));
  const byType: Row[] = ITEM_TYPES.map((t) => ({
    label: TYPE_META[t].label,
    value: items.filter((i) => i.type === t).length,
    color: TYPE_META[t].color,
  })).filter((r) => r.value > 0);
  const byPriority: Row[] = PRIORITIES.map((p) => ({
    label: PRIORITY_META[p].label,
    value: items.filter((i) => i.priority === p).length,
    color: PRIORITY_META[p].color,
  })).filter((r) => r.value > 0);

  const stories = items.filter((i) => i.type !== "EPIC");
  const withSpec = stories.filter((i) => i.spec);
  const approved = withSpec.filter((i) => i.spec!.status === "APPROVED").length;
  const inReview = withSpec.filter((i) => i.spec!.status === "IN_REVIEW").length;
  const draft = withSpec.filter((i) => i.spec!.status === "DRAFT").length;

  const pointsTotal = items.reduce((n, i) => n + (i.estimate ?? 0), 0);
  const pointsDone = items
    .filter((i) => catOf.get(i.stageId) === "DONE")
    .reduce((n, i) => n + (i.estimate ?? 0), 0);

  const wip = stages
    .filter((s) => s.wipLimit != null)
    .map((s) => {
      const count = items.filter((i) => i.stageId === s.id).length;
      return { name: s.name, count, limit: s.wipLimit as number, over: count > (s.wipLimit as number) };
    });

  return {
    total,
    done,
    inProgress,
    backlog,
    donePct: total ? Math.round((done / total) * 100) : 0,
    byStage,
    byType,
    byPriority,
    stories: stories.length,
    storiesWithSpec: withSpec.length,
    specCoveragePct: stories.length ? Math.round((withSpec.length / stories.length) * 100) : 0,
    approved,
    inReview,
    draft,
    pointsTotal,
    pointsDone,
    pointsPct: pointsTotal ? Math.round((pointsDone / pointsTotal) * 100) : 0,
    wip,
  };
}

function Stat({ label, value, sub, accent, testid }: { label: string; value: number; sub?: string; accent?: string; testid: string }) {
  return (
    <div className="card p-3" data-testid={testid}>
      <div className="text-xs" style={{ color: "var(--text-dim)" }}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: accent ?? "var(--text)" }}>
          {value}
        </span>
        {sub && (
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children, testid }: { title: string; children: React.ReactNode; testid: string }) {
  return (
    <section className="card p-4" data-testid={testid}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function BarList({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 truncate" style={{ color: "var(--text-dim)" }}>
            {r.label}
          </span>
          <div className="flex-1">
            <div className="h-4 rounded" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 6 : 0, background: r.color }} />
          </div>
          <span className="w-8 text-right tabular-nums" style={{ color: "var(--text-dim)" }}>
            {r.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Progress({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elev-2)" }}>
      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

function Donut({ percent, color }: { percent: number; color: string }) {
  return (
    <div
      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, var(--bg-elev-2) 0deg)` }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--bg-elev)" }}>
        <span className="text-lg font-semibold tabular-nums" data-testid="donut-value">
          {percent}%
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
