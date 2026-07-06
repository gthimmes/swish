"use client";

import { useMemo, useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { useItems } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Meter, PriorityBadge, SpecStatusBadge, TypeBadge } from "@/components/ui";
import { PRIORITY_META } from "@/lib/enums";
import type { Stage, WorkItem } from "@/lib/types";

export default function RoadmapPage() {
  const { project, openItem } = useWorkspace();
  const { data: items } = useItems(project?.id);

  const stages = useMemo(
    () => [...(project?.stages ?? [])].sort((a, b) => a.order - b.order),
    [project]
  );
  const doneStageIds = useMemo(
    () => new Set(stages.filter((s) => s.category === "DONE").length ? stages.filter((s) => s.category === "DONE").map((s) => s.id) : []),
    [stages]
  );

  const { epics, ungrouped, totals } = useMemo(() => {
    const all = items ?? [];
    const byEpic = new Map<string, WorkItem[]>();
    for (const it of all) {
      if (it.epicId) {
        const arr = byEpic.get(it.epicId) ?? [];
        arr.push(it);
        byEpic.set(it.epicId, arr);
      }
    }
    const epicItems = all
      .filter((i) => i.type === "EPIC")
      .sort(
        (a, b) =>
          PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight || a.rank - b.rank
      );
    const epics = epicItems.map((epic) => {
      const children = (byEpic.get(epic.id) ?? []).sort((a, b) => {
        const sa = stages.findIndex((s) => s.id === a.stageId);
        const sb = stages.findIndex((s) => s.id === b.stageId);
        return sb - sa || a.rank - b.rank; // most-progressed first
      });
      const done = children.filter((c) => doneStageIds.has(c.stageId)).length;
      return { epic, children, done };
    });

    const ungrouped = all
      .filter((i) => i.type !== "EPIC" && !i.epicId)
      .sort((a, b) => a.rank - b.rank);

    const stories = all.filter((i) => i.type !== "EPIC");
    const storiesDone = stories.filter((s) => doneStageIds.has(s.stageId)).length;
    return {
      epics,
      ungrouped,
      totals: { epics: epicItems.length, stories: stories.length, done: storiesDone },
    };
  }, [items, stages, doneStageIds]);

  const pct = totals.stories ? Math.round((totals.done / totals.stories) * 100) : 0;

  return (
    <>
      <PageHeader title="Roadmap">
        <div className="text-sm" style={{ color: "var(--text-dim)" }} data-testid="roadmap-summary">
          {totals.epics} epics · {totals.done}/{totals.stories} stories done · {pct}%
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {epics.map(({ epic, children, done }) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              stories={children}
              done={done}
              stages={stages}
              onOpen={openItem}
            />
          ))}

          {ungrouped.length > 0 && (
            <UngroupedCard items={ungrouped} stages={stages} onOpen={openItem} />
          )}

          {epics.length === 0 && (
            <div className="p-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
              No epics yet. Create an item of type Epic to start a roadmap.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StageBar({ items, stages }: { items: WorkItem[]; stages: Stage[] }) {
  const counts = stages.map((s) => ({ stage: s, n: items.filter((i) => i.stageId === s.id).length }));
  const total = items.length || 1;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elev-2)" }} data-testid="stage-bar">
      {counts.map(({ stage, n }) =>
        n > 0 ? (
          <div
            key={stage.id}
            style={{ width: `${(n / total) * 100}%`, background: stage.color }}
            title={`${stage.name}: ${n}`}
          />
        ) : null
      )}
    </div>
  );
}

function EpicCard({
  epic,
  stories,
  done,
  stages,
  onOpen,
}: {
  epic: WorkItem;
  stories: WorkItem[];
  done: number;
  stages: Stage[];
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = stories.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="card p-4" data-testid="roadmap-epic" data-key={epic.key}>
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 text-xs"
          style={{ color: "var(--text-faint)" }}
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "▾" : "▸"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TypeBadge type={epic.type} />
            <button
              className="truncate text-base font-semibold hover:underline"
              onClick={() => onOpen(epic.id)}
              data-testid="roadmap-epic-title"
            >
              {epic.title}
            </button>
            <PriorityBadge priority={epic.priority} showLabel />
            <span className="ml-auto text-xs tabular-nums" style={{ color: pct === 100 ? "#22c55e" : "var(--text-dim)" }}>
              {done}/{total} · {pct}%
            </span>
          </div>
          {epic.description && (
            <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
              {epic.description}
            </p>
          )}
          <div className="mt-2.5">
            <StageBar items={stories} stages={stages} />
          </div>
        </div>
      </div>

      {open && total > 0 && (
        <ul className="mt-3 flex flex-col gap-1 pl-6">
          {stories.map((c) => (
            <StoryRow key={c.id} item={c} stages={stages} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  );
}

function UngroupedCard({
  items,
  stages,
  onOpen,
}: {
  items: WorkItem[];
  stages: Stage[];
  onOpen: (id: string) => void;
}) {
  return (
    <section className="card p-4" data-testid="roadmap-ungrouped">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base font-semibold">Standalone work</span>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          {items.length}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((c) => (
          <StoryRow key={c.id} item={c} stages={stages} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

function StoryRow({ item, stages, onOpen }: { item: WorkItem; stages: Stage[]; onOpen: (id: string) => void }) {
  const stage = stages.find((s) => s.id === item.stageId);
  const criteria = item.spec?.criteria ?? [];
  const done = criteria.filter((c) => c.done).length;
  return (
    <li
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--bg-elev-2)]"
      data-testid="roadmap-story"
      data-key={item.key}
      onClick={() => onOpen(item.id)}
    >
      <TypeBadge type={item.type} />
      <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
        {item.key}
      </span>
      <span className="truncate text-sm">{item.title}</span>
      <span className="ml-auto flex items-center gap-2">
        {item.spec && <SpecStatusBadge status={item.spec.status} />}
        <Meter done={done} total={criteria.length} />
        {stage && (
          <span
            className="chip"
            style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}44` }}
          >
            {stage.name}
          </span>
        )}
        <Avatar user={item.assignee} size={20} />
      </span>
    </li>
  );
}
