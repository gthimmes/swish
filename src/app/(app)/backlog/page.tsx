"use client";

import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useWorkspace } from "@/components/workspace";
import { useItems, api } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { Filters, EMPTY_FILTERS, filtersToParams, type FilterState } from "@/components/Filters";
import { NewItemButton } from "@/components/NewItemButton";
import { Avatar, DueChip, LabelChip, Meter, PriorityBadge, SpecStatusBadge, TypeBadge } from "@/components/ui";
import { PRIORITY_META, PRIORITIES } from "@/lib/enums";
import type { WorkItem } from "@/lib/types";

type SortKey = "rank" | "priority" | "title" | "stage" | "estimate" | "due";

export default function BacklogPage() {
  const { project, openItem, users } = useWorkspace();
  const { mutate } = useSWRConfig();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("rank");
  const [dir, setDir] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const params = filtersToParams(filters);
  const { data: items } = useItems(project?.id, params);

  const stageName = useMemo(() => {
    const m = new Map<string, { name: string; order: number; color: string; category: string }>();
    project?.stages.forEach((s) => m.set(s.id, { name: s.name, order: s.order, color: s.color, category: s.category }));
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
        case "due": {
          const av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = av - bv;
          break;
        }
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const allSelected = sorted.length > 0 && sorted.every((i) => selected.has(i.id));
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((i) => i.id)));
  }

  async function bulk(body: Record<string, unknown>) {
    await api("/api/items/bulk", "POST", { ids: Array.from(selected), ...body });
    setSelected(new Set());
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
              <th className="w-9 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  data-testid="select-all"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
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
              <Th onClick={() => toggleSort("due")} active={sort === "due"} dir={dir} className="w-24">
                Due
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
                done={stageName.get(item.stageId)?.category === "DONE"}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
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

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          stages={project?.stages ?? []}
          users={users}
          onStage={(stageId) => bulk({ patch: { stageId } })}
          onAssignee={(assigneeId) => bulk({ patch: { assigneeId } })}
          onPriority={(priority) => bulk({ patch: { priority } })}
          onDelete={() => bulk({ delete: true })}
          onClear={() => setSelected(new Set())}
        />
      )}
    </>
  );
}

function BulkBar({
  count,
  stages,
  users,
  onStage,
  onAssignee,
  onPriority,
  onDelete,
  onClear,
}: {
  count: number;
  stages: { id: string; name: string }[];
  users: { id: string; name: string }[];
  onStage: (id: string) => void;
  onAssignee: (id: string | null) => void;
  onPriority: (p: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div
      className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2 shadow-2xl"
      style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)" }}
      data-testid="bulk-bar"
    >
      <span className="px-1 text-sm font-medium" data-testid="bulk-count">
        {count} selected
      </span>
      <select
        className="input w-auto"
        data-testid="bulk-stage"
        defaultValue=""
        onChange={(e) => e.target.value && onStage(e.target.value)}
      >
        <option value="">Stage…</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        className="input w-auto"
        data-testid="bulk-assignee"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onAssignee(e.target.value === "none" ? null : e.target.value);
        }}
      >
        <option value="">Assignee…</option>
        <option value="none">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <select
        className="input w-auto"
        data-testid="bulk-priority"
        defaultValue=""
        onChange={(e) => e.target.value && onPriority(e.target.value)}
      >
        <option value="">Priority…</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_META[p].label}
          </option>
        ))}
      </select>
      {confirmDelete ? (
        <span className="flex items-center gap-1">
          <button className="btn btn-outline text-xs" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button className="btn text-xs" style={{ color: "var(--danger)" }} data-testid="bulk-delete-confirm" onClick={onDelete}>
            Delete {count}
          </button>
        </span>
      ) : (
        <button className="btn btn-ghost px-2 py-1" style={{ color: "var(--danger)" }} data-testid="bulk-delete" onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      )}
      <button className="btn btn-ghost px-2 py-1 text-xs" data-testid="bulk-clear" onClick={onClear}>
        ✕
      </button>
    </div>
  );
}

function BacklogRow({
  item,
  stages,
  stageColor,
  done,
  selected,
  onToggleSelect,
  onOpen,
  onPatch,
}: {
  item: WorkItem;
  stages: { id: string; name: string }[];
  stageColor: string;
  done: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onPatch: (d: Record<string, unknown>) => void;
}) {
  const criteria = item.spec?.criteria ?? [];
  const criteriaDone = criteria.filter((c) => c.done).length;
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-[var(--bg-elev)]"
      style={{ borderBottom: "1px solid var(--border)", background: selected ? "var(--accent-soft)" : undefined }}
      data-testid="backlog-row"
      data-key={item.key}
      data-selected={selected}
      onClick={onOpen}
    >
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${item.key}`}
          data-testid="row-select"
          checked={selected}
          onChange={onToggleSelect}
        />
      </td>
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
        {item.dueDate ? <DueChip due={item.dueDate} done={done} /> : <span style={{ color: "var(--text-faint)" }}>—</span>}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {item.spec ? <SpecStatusBadge status={item.spec.status} /> : <span style={{ color: "var(--text-faint)" }}>—</span>}
          <Meter done={criteriaDone} total={criteria.length} />
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
