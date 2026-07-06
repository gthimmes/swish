"use client";

import { useWorkspace } from "./workspace";
import { ITEM_TYPES, PRIORITIES, TYPE_META, PRIORITY_META } from "@/lib/enums";

export type FilterState = {
  q: string;
  assigneeId: string;
  type: string;
  priority: string;
  labelId: string;
};

export const EMPTY_FILTERS: FilterState = { q: "", assigneeId: "", type: "", priority: "", labelId: "" };

export function filtersToParams(f: FilterState): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.q) p.q = f.q;
  if (f.assigneeId) p.assigneeId = f.assigneeId;
  if (f.type) p.type = f.type;
  if (f.priority) p.priority = f.priority;
  if (f.labelId) p.labelId = f.labelId;
  return p;
}

export function hasActiveFilters(f: FilterState) {
  return Boolean(f.q || f.assigneeId || f.type || f.priority || f.labelId);
}

export function Filters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const { users, project } = useWorkspace();
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon />
        <input
          className="input w-48 pl-8"
          placeholder="Search…"
          aria-label="Search items"
          data-testid="filter-search"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <Select value={value.assigneeId} onChange={(v) => set({ assigneeId: v })} testid="filter-assignee" label="Assignee">
        <option value="">All assignees</option>
        <option value="none">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>

      <Select value={value.type} onChange={(v) => set({ type: v })} testid="filter-type" label="Type">
        <option value="">All types</option>
        {ITEM_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_META[t].label}
          </option>
        ))}
      </Select>

      <Select value={value.priority} onChange={(v) => set({ priority: v })} testid="filter-priority" label="Priority">
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_META[p].label}
          </option>
        ))}
      </Select>

      {project && project.labels.length > 0 && (
        <Select value={value.labelId} onChange={(v) => set({ labelId: v })} testid="filter-label" label="Label">
          <option value="">All labels</option>
          {project.labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      )}

      {hasActiveFilters(value) && (
        <button className="btn btn-ghost text-xs" data-testid="filter-clear" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear
        </button>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  testid,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  testid: string;
  label: string;
}) {
  return (
    <select
      className="input w-auto"
      style={{ paddingRight: 8 }}
      aria-label={label}
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-faint)"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
