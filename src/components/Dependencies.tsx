"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useWorkspace } from "./workspace";
import type { DepRef, WorkItemDetail } from "@/lib/types";

export function DependenciesSection({ item, onChanged }: { item: WorkItemDetail; onChanged: () => void }) {
  const { project } = useWorkspace();
  const [options, setOptions] = useState<{ id: string; key: string; title: string }[]>([]);

  useEffect(() => {
    if (!project) return;
    fetch(`/api/items?projectId=${project.id}`)
      .then((r) => r.json())
      .then((rows) => setOptions(rows.map((r: { id: string; key: string; title: string }) => ({ id: r.id, key: r.key, title: r.title }))))
      .catch(() => {});
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const relatedIds = useMemo(
    () => new Set([item.id, ...item.blocks.map((d) => d.blocked.id), ...item.blockedBy.map((d) => d.blocker.id)]),
    [item]
  );
  const pickable = options.filter((o) => !relatedIds.has(o.id));

  async function add(type: "blocks" | "blockedBy", otherId: string) {
    if (!otherId) return;
    await api(`/api/items/${item.id}/dependencies`, "POST", { type, otherId });
    onChanged();
  }
  async function remove(depId: string) {
    await api(`/api/dependencies/${depId}`, "DELETE");
    onChanged();
  }

  return (
    <section className="px-5 pb-4" data-testid="dependencies">
      <DepList
        label="Blocked by"
        hint="must finish before this can"
        rows={item.blockedBy.map((d) => ({ depId: d.id, ref: d.blocker }))}
        pickable={pickable}
        onAdd={(otherId) => add("blockedBy", otherId)}
        onRemove={remove}
        testid="blocked-by"
      />
      <div className="h-2" />
      <DepList
        label="Blocks"
        hint="can't start until this finishes"
        rows={item.blocks.map((d) => ({ depId: d.id, ref: d.blocked }))}
        pickable={pickable}
        onAdd={(otherId) => add("blocks", otherId)}
        onRemove={remove}
        testid="blocks"
      />
    </section>
  );
}

function DepList({
  label,
  hint,
  rows,
  pickable,
  onAdd,
  onRemove,
  testid,
}: {
  label: string;
  hint: string;
  rows: { depId: string; ref: DepRef }[];
  pickable: { id: string; key: string; title: string }[];
  onAdd: (otherId: string) => void;
  onRemove: (depId: string) => void;
  testid: string;
}) {
  return (
    <div data-testid={`dep-${testid}`}>
      <label className="mb-1 flex items-baseline gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
          {label}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          {hint}
        </span>
      </label>
      <ul className="mb-1.5 flex flex-col gap-1">
        {rows.map((r) => {
          const open = r.ref.stage.category !== "DONE";
          return (
            <li
              key={r.depId}
              className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm"
              style={{ background: "var(--bg-elev-2)" }}
              data-testid={`dep-${testid}-row`}
              data-key={r.ref.key}
            >
              <span style={{ color: open ? "#ef4444" : "#22c55e" }}>{open ? "●" : "✓"}</span>
              <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                {r.ref.key}
              </span>
              <span className="truncate">{r.ref.title}</span>
              <span className="ml-auto text-[11px]" style={{ color: "var(--text-faint)" }}>
                {r.ref.stage.name}
              </span>
              <button
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--text-faint)" }}
                aria-label="Remove dependency"
                data-testid={`dep-${testid}-remove`}
                onClick={() => onRemove(r.depId)}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <select
        className="input"
        data-testid={`dep-${testid}-add`}
        value=""
        onChange={(e) => {
          onAdd(e.target.value);
          e.target.value = "";
        }}
      >
        <option value="">+ Add {label.toLowerCase()}…</option>
        {pickable.map((o) => (
          <option key={o.id} value={o.id}>
            {o.key} — {o.title}
          </option>
        ))}
      </select>
    </div>
  );
}
