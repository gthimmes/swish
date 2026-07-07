"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/components/workspace";
import { useItems, fetcher, api } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/Modal";
import { Avatar, DueChip, TypeBadge } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import type { Cycle, WorkItem } from "@/lib/types";

function cycleStatus(c: Cycle) {
  const now = Date.now();
  const s = new Date(c.startDate).getTime();
  const e = new Date(c.endDate).getTime();
  if (now < s) return { label: "Upcoming", color: "#0ea5e9" };
  if (now > e) return { label: "Completed", color: "#64748b" };
  return { label: "Active", color: "#22c55e" };
}

export default function CyclesPage() {
  const { project, openItem } = useWorkspace();
  const key = project ? `/api/projects/${project.id}/cycles` : null;
  const { data: cycles, mutate } = useSWR<Cycle[]>(key, fetcher);
  const { data: items } = useItems(project?.id);

  const doneIds = useMemo(
    () => new Set((project?.stages ?? []).filter((s) => s.category === "DONE").map((s) => s.id)),
    [project]
  );
  const byCycle = useMemo(() => {
    const m = new Map<string, WorkItem[]>();
    (items ?? []).forEach((i) => {
      if (i.cycleId) {
        const arr = m.get(i.cycleId) ?? [];
        arr.push(i);
        m.set(i.cycleId, arr);
      }
    });
    return m;
  }, [items]);

  const [creating, setCreating] = useState(false);

  async function remove(id: string) {
    await api(`/api/cycles/${id}`, "DELETE");
    mutate();
  }

  return (
    <>
      <PageHeader title="Cycles" count={cycles?.length}>
        <button className="btn btn-primary" data-testid="new-cycle" onClick={() => setCreating(true)}>
          + New cycle
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {(cycles ?? []).map((c) => {
            const cItems = byCycle.get(c.id) ?? [];
            const done = cItems.filter((i) => doneIds.has(i.stageId)).length;
            const pct = cItems.length ? Math.round((done / cItems.length) * 100) : 0;
            const status = cycleStatus(c);
            return (
              <section key={c.id} className="card p-4" data-testid="cycle" data-name={c.name}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base font-semibold">{c.name}</span>
                  <span
                    className="chip"
                    style={{ background: `${status.color}22`, color: status.color, border: `1px solid ${status.color}44` }}
                    data-testid="cycle-status"
                  >
                    {status.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                  </span>
                  <span className="ml-auto text-xs tabular-nums" style={{ color: pct === 100 ? "#22c55e" : "var(--text-dim)" }}>
                    {done}/{cItems.length} done · {pct}%
                  </span>
                  <button
                    className="btn btn-ghost px-2 py-0.5 text-xs"
                    style={{ color: "var(--danger)" }}
                    data-testid="cycle-delete"
                    onClick={() => remove(c.id)}
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elev-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#22c55e" }} />
                </div>
                {cItems.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    No items yet — assign items to this cycle from their detail panel.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {cItems.map((it) => (
                      <li
                        key={it.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--bg-elev-2)]"
                        data-testid="cycle-item"
                        data-key={it.key}
                        onClick={() => openItem(it.id)}
                      >
                        <TypeBadge type={it.type} />
                        <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                          {it.key}
                        </span>
                        <span className="truncate">{it.title}</span>
                        <span className="ml-auto flex items-center gap-2">
                          <DueChip due={it.dueDate} done={doneIds.has(it.stageId)} />
                          <Avatar user={it.assignee} size={20} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {cycles && cycles.length === 0 && (
            <div className="p-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
              No cycles yet. Create one for teams that want cadence — Swish never forces it.
            </div>
          )}
        </div>
      </div>

      {project && (
        <NewCycleModal
          open={creating}
          projectId={project.id}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            mutate();
          }}
        />
      )}
    </>
  );
}

function NewCycleModal({
  open,
  projectId,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !start || !end) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/cycles`, "POST", { name: name.trim(), startDate: start, endDate: end });
      setName("");
      setStart("");
      setEnd("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New cycle" width={420}>
      <div className="flex flex-col gap-3">
        <input
          className="input"
          autoFocus
          data-testid="cycle-name"
          placeholder="Cycle name (e.g. Sprint 26)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-dim)" }}>
              Start
            </label>
            <input className="input" type="date" data-testid="cycle-start" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-dim)" }}>
              End
            </label>
            <input className="input" type="date" data-testid="cycle-end" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            data-testid="cycle-submit"
            disabled={busy || !name.trim() || !start || !end}
            onClick={submit}
          >
            Create cycle
          </button>
        </div>
      </div>
    </Modal>
  );
}
