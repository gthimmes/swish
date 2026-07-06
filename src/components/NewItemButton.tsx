"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { useWorkspace } from "./workspace";
import { api } from "@/lib/client";
import { ITEM_TYPES, PRIORITIES, TYPE_META, PRIORITY_META } from "@/lib/enums";
import { Modal } from "./Modal";

export function NewItemButton() {
  const { project, users, openItem } = useWorkspace();
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("STORY");
  const [priority, setPriority] = useState("MEDIUM");
  const [stageId, setStageId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [withSpec, setWithSpec] = useState(true);
  const [busy, setBusy] = useState(false);

  // Allow a global keyboard shortcut to open the modal.
  useEffect(() => {
    const openModal = () => setOpen(true);
    window.addEventListener("swish:new-item", openModal);
    return () => window.removeEventListener("swish:new-item", openModal);
  }, []);

  function reset() {
    setTitle("");
    setType("STORY");
    setPriority("MEDIUM");
    setStageId("");
    setAssigneeId("");
    setWithSpec(true);
  }

  async function submit() {
    if (!title.trim() || !project) return;
    setBusy(true);
    try {
      const created = await api<{ id: string }>("/api/items", "POST", {
        projectId: project.id,
        title: title.trim(),
        type,
        priority,
        stageId: stageId || undefined,
        assigneeId: assigneeId || undefined,
        withSpec,
      });
      // Revalidate every board/backlog query for this project.
      mutate((k) => typeof k === "string" && k.startsWith("/api/items?"));
      setOpen(false);
      reset();
      openItem(created.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" data-testid="new-item" onClick={() => setOpen(true)}>
        <span className="text-base leading-none">+</span> New
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Create work item">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-dim)" }}>
              Title
            </label>
            <input
              className="input"
              data-testid="new-item-title"
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" data-testid="new-item-type" value={type} onChange={(e) => setType(e.target.value)}>
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
                <option value="">First stage</option>
                {project?.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
            <input type="checkbox" checked={withSpec} onChange={(e) => setWithSpec(e.target.checked)} />
            Start with a spec
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button className="btn btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" data-testid="new-item-submit" disabled={busy || !title.trim()} onClick={submit}>
              {busy ? "Creating…" : "Create item"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-dim)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
