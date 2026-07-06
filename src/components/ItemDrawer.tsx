"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { useWorkspace } from "./workspace";
import { useItem, api } from "@/lib/client";
import { ITEM_TYPES, PRIORITIES, TYPE_META, PRIORITY_META } from "@/lib/enums";
import type { WorkItemDetail } from "@/lib/types";
import { Avatar, LabelChip, TypeBadge } from "./ui";
import { SpecEditor } from "./SpecEditor";

export function ItemDrawer() {
  const { openItemId, openItem } = useWorkspace();
  const open = Boolean(openItemId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) openItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openItem]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(4,6,10,0.5)" }}
          onClick={() => openItem(null)}
          data-testid="drawer-backdrop"
        />
      )}
      <aside
        className="fixed right-0 top-0 z-40 flex h-full w-full flex-col overflow-hidden shadow-2xl transition-transform duration-200 sm:w-[560px]"
        style={{
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        aria-hidden={!open}
        data-testid="item-drawer"
      >
        {openItemId && <DrawerContent id={openItemId} key={openItemId} />}
      </aside>
    </>
  );
}

function DrawerContent({ id }: { id: string }) {
  const { openItem, project, users } = useWorkspace();
  const { data: item, mutate: mutateItem } = useItem(id);
  const { mutate } = useSWRConfig();
  const [tab, setTab] = useState<"spec" | "activity">("spec");

  function revalidate() {
    mutateItem();
    mutate((k) => typeof k === "string" && k.startsWith("/api/items?"));
  }

  async function patch(data: Record<string, unknown>) {
    await api(`/api/items/${id}`, "PATCH", data);
    revalidate();
  }

  if (!item) {
    return <div className="p-6 text-sm" style={{ color: "var(--text-dim)" }}>Loading…</div>;
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <TypeBadge type={item.type} showLabel />
        <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }} data-testid="drawer-key">
          {item.key}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <DeleteButton
            onConfirm={async () => {
              await api(`/api/items/${id}`, "DELETE");
              mutate((k) => typeof k === "string" && k.startsWith("/api/items?"));
              openItem(null);
            }}
          />
          <button className="btn btn-ghost px-2 py-1" aria-label="Close drawer" data-testid="drawer-close" onClick={() => openItem(null)}>
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-5 pt-4">
          <TitleField item={item} onSave={(title) => patch({ title })} />
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
          <Meta label="Stage">
            <select
              className="input"
              data-testid="drawer-stage"
              value={item.stageId}
              onChange={(e) => patch({ stageId: e.target.value })}
            >
              {project?.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Meta>
          <Meta label="Assignee">
            <select
              className="input"
              data-testid="drawer-assignee"
              value={item.assigneeId ?? ""}
              onChange={(e) => patch({ assigneeId: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Meta>
          <Meta label="Priority">
            <select className="input" data-testid="drawer-priority" value={item.priority} onChange={(e) => patch({ priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </Meta>
          <Meta label="Type">
            <select className="input" value={item.type} onChange={(e) => patch({ type: e.target.value })}>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label}
                </option>
              ))}
            </select>
          </Meta>
          <Meta label="Estimate">
            <input
              className="input"
              type="number"
              min={0}
              data-testid="drawer-estimate"
              value={item.estimate ?? ""}
              placeholder="—"
              onChange={(e) => patch({ estimate: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Meta>
          <Meta label="Epic">
            <EpicSelect item={item} onChange={(epicId) => patch({ epicId })} />
          </Meta>
        </div>

        {/* Labels */}
        <div className="px-5 pb-4">
          <Meta label="Labels">
            <LabelsEditor item={item} onChange={(labelIds) => patch({ labelIds })} />
          </Meta>
        </div>

        {/* Description */}
        <div className="px-5 pb-4">
          <DescriptionField item={item} onSave={(description) => patch({ description })} />
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 flex gap-1 px-5" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <Tab active={tab === "spec"} onClick={() => setTab("spec")} testid="tab-spec">
            Spec
          </Tab>
          <Tab active={tab === "activity"} onClick={() => setTab("activity")} testid="tab-activity">
            Activity
          </Tab>
        </div>

        <div className="px-5 py-4">
          {tab === "spec" ? <SpecEditor item={item} onChanged={revalidate} /> : <ActivityFeed item={item} onChanged={() => mutateItem()} />}
        </div>
      </div>
    </>
  );
}

function TitleField({ item, onSave }: { item: WorkItemDetail; onSave: (t: string) => void }) {
  const [value, setValue] = useState(item.title);
  useEffect(() => setValue(item.title), [item.id, item.title]);
  return (
    <textarea
      className="w-full resize-none bg-transparent text-xl font-semibold leading-tight outline-none"
      data-testid="drawer-title"
      rows={2}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value.trim() && value !== item.title && onSave(value.trim())}
    />
  );
}

function DescriptionField({ item, onSave }: { item: WorkItemDetail; onSave: (d: string) => void }) {
  const [value, setValue] = useState(item.description ?? "");
  useEffect(() => setValue(item.description ?? ""), [item.id, item.description]);
  return (
    <div>
      <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-dim)" }}>
        Description
      </label>
      <textarea
        className="input min-h-16 resize-y leading-relaxed"
        data-testid="drawer-description"
        value={value}
        placeholder="Add a short description…"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== (item.description ?? "") && onSave(value)}
      />
    </div>
  );
}

function EpicSelect({ item, onChange }: { item: WorkItemDetail; onChange: (id: string | null) => void }) {
  const { project } = useWorkspace();
  // Fetch the project's epics to populate the selector.
  const [options, setOptions] = useState<{ id: string; title: string; key: string }[]>([]);
  useEffect(() => {
    if (!project) return;
    fetch(`/api/items?projectId=${project.id}&type=EPIC`)
      .then((r) => r.json())
      .then((rows) => setOptions(rows.map((r: { id: string; title: string; key: string }) => ({ id: r.id, title: r.title, key: r.key }))))
      .catch(() => {});
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <select
      className="input"
      data-testid="drawer-epic"
      value={item.epicId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">No epic</option>
      {options
        .filter((o) => o.id !== item.id)
        .map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
    </select>
  );
}

function LabelsEditor({ item, onChange }: { item: WorkItemDetail; onChange: (ids: string[]) => void }) {
  const { project } = useWorkspace();
  const selected = new Set(item.labels.map((l) => l.id));
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="drawer-labels">
      {project?.labels.map((l) => {
        const on = selected.has(l.id);
        return (
          <button
            key={l.id}
            onClick={() => toggle(l.id)}
            className="chip transition-opacity"
            style={{
              background: on ? `${l.color}22` : "transparent",
              color: on ? l.color : "var(--text-faint)",
              border: `1px solid ${on ? `${l.color}55` : "var(--border)"}`,
            }}
          >
            {l.name}
          </button>
        );
      })}
      {item.labels.length === 0 && project?.labels.length === 0 && (
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          No labels defined
        </span>
      )}
    </div>
  );
}

function ActivityFeed({ item, onChanged }: { item: WorkItemDetail; onChanged: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function comment() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api(`/api/items/${item.id}/activity`, "POST", { body: body.trim() });
      setBody("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="activity-feed">
      <div className="mb-4 flex gap-2">
        <input
          className="input"
          data-testid="comment-input"
          placeholder="Leave a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && comment()}
        />
        <button className="btn btn-outline" disabled={busy} onClick={comment}>
          Send
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {item.activity.map((a) => (
          <li key={a.id} className="flex gap-2.5 text-sm">
            <Avatar user={a.user} size={22} />
            <div>
              <div style={{ color: a.kind === "event" ? "var(--text-faint)" : "var(--text)" }}>
                {a.kind === "event" ? <em>{a.body}</em> : a.body}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                {a.user?.name ?? "system"} · {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button className="btn btn-ghost px-2 py-1" onClick={() => setConfirm(false)}>
          Cancel
        </button>
        <button className="btn px-2 py-1" style={{ color: "var(--danger)" }} data-testid="drawer-delete-confirm" onClick={onConfirm}>
          Delete
        </button>
      </span>
    );
  }
  return (
    <button className="btn btn-ghost px-2 py-1" aria-label="Delete item" data-testid="drawer-delete" onClick={() => setConfirm(true)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
      </svg>
    </button>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-dim)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Tab({ active, onClick, children, testid }: { active: boolean; onClick: () => void; children: React.ReactNode; testid: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className="border-b-2 px-3 py-2 text-sm font-medium transition-colors"
      style={{
        borderColor: active ? "var(--accent)" : "transparent",
        color: active ? "var(--text)" : "var(--text-dim)",
      }}
    >
      {children}
    </button>
  );
}
