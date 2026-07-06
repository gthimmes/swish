"use client";

import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useWorkspace } from "@/components/workspace";
import { useItems, api } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { Filters, EMPTY_FILTERS, filtersToParams, type FilterState } from "@/components/Filters";
import { NewItemButton } from "@/components/NewItemButton";
import { Avatar, LabelChip, Meter, PriorityBadge, SpecStatusBadge, TypeBadge } from "@/components/ui";
import { PRIORITY_META } from "@/lib/enums";
import type { WorkItem } from "@/lib/types";

type SortKey = "rank" | "priority" | "title" | "stage" | "estimate";

export default function BacklogPage() {
  const { project, openItem } = useWorkspace();
  const { mutate } = useSWRConfig();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("rank");
  const [dir, setDir] = useState<1 | -1>(1);

  const params = filtersToParams(filters);
  const { data: items } = useItems(project?.id, params);

  const stageName = useMemo(() => {
    const m = new Map<string, { name: string; order: number; color: string }>();
    project?.stages.forEach((s) => m.set(s.id, { name: s.name, order: s.order, color: s.color }));
    return m;
  }, [project]);

  const sorted = useMemo(() => {
    if (!items) return [];
    const arr = [...items];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "priority":
          cmp = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight;
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "stage":
          cmp = (stageName.get(a.stageId)?.order ?? 0) - (stageName.get(b.stageId)?.order ?? 0);
          break;
        case "estimate":
          cmp = (a.estimate ?? -1) - (b.estimate ?? -1);
          break;
        default:
          cmp = a.rank - b.rank;
      }
      return cmp * dir;
    });
    return arr;
  }, [items, sort, dir, stageName]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(key);
      setDir(1);
    }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await api(`/api/items/${id}`, "PATCH", data);
    mutate((k) => typeof k === "string" && k.startsWith("/api/items?"));
  }

  const totalPoints = sorted.reduce((n, i) => n + (i.estimate ?? 0), 0);

  return (
    <>
      <PageHeader title="Backlog" count={sorted.length}>
        <Filters value={filters} onChange={setFilters} />
        <NewItemButton />
      </PageHeader>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm" data-testid="backlog-table">
          <thead className="sticky top-0 z-10" style={{ background: "var(--bg-elev)" }}>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <Th onClick={() => toggleSort("title")} active={sort === "title"} dir={dir}>
                Item
              </Th>
              <Th onClick={() => toggleSort("stage")} active={sort === "stage"} dir={dir} className="w-40">
                Stage
              </Th>
              <Th onClick={() => toggleSort("priority")} active={sort === "priority"} dir={dir} className="w-28">
                Priority
              </Th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-dim)" }}>
                Assignee
              </th>
              <Th onClick={() => toggleSort("estimate")} active={sort === "estimate"} dir={dir} className="w-20">
                Points
              </Th>
              <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-dim)" }}>
                Spec
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <BacklogRow
                key={item.id}
                item={item}
                stages={project?.stages ?? []}
                stageColor={stageName.get(item.stageId)?.color ?? "#64748b"}
                onOpen={() => openItem(item.id)}
                onPatch={(d) => patch(item.id, d)}
              />
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
            No items match your filters.
          </div>
        )}

        {sorted.length > 0 && (
          <div className="px-4 py-3 text-xs" style={{ color: "var(--text-faint)" }}>
            {sorted.length} items · {totalPoints} points
          </div>
        )}
      </div>
    </>
  );
}

function BacklogRow({
  item,
  stages,
  stageColor,
  onOpen,
  onPatch,
}: {
  item: WorkItem;
  stages: { id: string; name: string }[];
  stageColor: string;
  onOpen: () => void;
  onPatch: (d: Record<string, unknown>) => void;
}) {
  const criteria = item.spec?.criteria ?? [];
  const done = criteria.filter((c) => c.done).length;
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-[var(--bg-elev)]"
      style={{ borderBottom: "1px solid var(--border)" }}
      data-testid="backlog-row"
      data-key={item.key}
      onClick={onOpen}
    >
      <td className="px-3 py-2" data-testid="backlog-item-cell">
        <div className="flex items-center gap-2">
          <TypeBadge type={item.type} />
          <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
            {item.key}
          </span>
          <span>{item.title}</span>
          {item.labels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      </td>
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <select
          className="input"
          data-testid="row-stage"
          value={item.stageId}
          onChange={(e) => onPatch({ stageId: e.target.value })}
          style={{ borderLeft: `3px solid ${stageColor}` }}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <PriorityBadge priority={item.priority} showLabel />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar user={item.assignee} size={22} />
          <span style={{ color: "var(--text-dim)" }}>{item.assignee?.name ?? "—"}</span>
        </div>
      </td>
      <td className="px-3 py-2" style={{ color: "var(--text-dim)" }}>
        {item.estimate ?? "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {item.spec ? <SpecStatusBadge status={item.spec.status} /> : <span style={{ color: "var(--text-faint)" }}>—</span>}
          <Meter done={done} total={criteria.length} />
        </div>
      </td>
    </tr>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 1 | -1;
  className?: string;
}) {
  return (
    <th className={`px-3 py-2 text-left font-medium ${className}`}>
      <button
        className="inline-flex items-center gap-1"
        style={{ color: active ? "var(--text)" : "var(--text-dim)" }}
        onClick={onClick}
      >
        {children}
        {active && <span className="text-[10px]">{dir === 1 ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
