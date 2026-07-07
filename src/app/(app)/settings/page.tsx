"use client";

import { useState } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/components/workspace";
import { api, fetcher } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { STAGE_CATEGORIES, CATEGORY_META, FIELD_TYPES, FIELD_TYPE_META, type StageCategory } from "@/lib/enums";
import type { CustomField, Stage } from "@/lib/types";

const SWATCHES = ["#64748b", "#a855f7", "#0ea5e9", "#3b82f6", "#eab308", "#22c55e", "#ef4444", "#ec4899", "#f59e0b", "#14b8a6"];

export default function SettingsPage() {
  const { project, reloadProject } = useWorkspace();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const stages = [...(project?.stages ?? [])].sort((a, b) => a.order - b.order);

  async function patchStage(id: string, data: Record<string, unknown>) {
    await api(`/api/stages/${id}`, "PATCH", data);
    reloadProject();
  }

  async function addStage() {
    if (!newName.trim() || !project) return;
    setBusy(true);
    try {
      await api(`/api/projects/${project.id}/stages`, "POST", { name: newName.trim() });
      setNewName("");
      reloadProject();
    } finally {
      setBusy(false);
    }
  }

  async function move(stage: Stage, delta: number) {
    const idx = stages.findIndex((s) => s.id === stage.id);
    const swap = stages[idx + delta];
    if (!swap) return;
    // Swap order values.
    await Promise.all([
      api(`/api/stages/${stage.id}`, "PATCH", { order: swap.order }),
      api(`/api/stages/${swap.id}`, "PATCH", { order: stage.order }),
    ]);
    reloadProject();
  }

  async function remove(stage: Stage) {
    await api(`/api/stages/${stage.id}`, "DELETE");
    reloadProject();
  }

  return (
    <>
      <PageHeader title="Workflow" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          <p className="mb-1 text-sm" style={{ color: "var(--text-dim)" }}>
            Your workflow, your rules. Stages are the columns on your board — add, rename, recolor, reorder,
            and delete them freely. No admin gate.
          </p>
          <p className="mb-6 text-xs" style={{ color: "var(--text-faint)" }}>
            Categories power metrics and WIP semantics. Deleting a stage moves its items to the first remaining stage.
          </p>

          <div className="flex flex-col gap-2" data-testid="stage-list">
            {stages.map((stage, i) => (
              <div
                key={stage.id}
                className="card flex items-center gap-3 p-3"
                data-testid="stage-row"
                data-stage-name={stage.name}
              >
                <div className="flex flex-col">
                  <button
                    className="leading-none disabled:opacity-20"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => move(stage, -1)}
                    style={{ color: "var(--text-dim)" }}
                  >
                    ▲
                  </button>
                  <button
                    className="leading-none disabled:opacity-20"
                    aria-label="Move down"
                    disabled={i === stages.length - 1}
                    onClick={() => move(stage, 1)}
                    style={{ color: "var(--text-dim)" }}
                  >
                    ▼
                  </button>
                </div>

                <ColorPicker value={stage.color} onChange={(color) => patchStage(stage.id, { color })} />

                <input
                  className="input flex-1"
                  data-testid="stage-name-input"
                  defaultValue={stage.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== stage.name) patchStage(stage.id, { name: v });
                  }}
                />

                <select
                  className="input w-auto"
                  data-testid="stage-category"
                  value={stage.category}
                  onChange={(e) => patchStage(stage.id, { category: e.target.value as StageCategory })}
                >
                  {STAGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
                  WIP
                  <input
                    className="input w-16"
                    type="number"
                    min={0}
                    defaultValue={stage.wipLimit ?? ""}
                    placeholder="∞"
                    onBlur={(e) =>
                      patchStage(stage.id, { wipLimit: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </label>

                <button
                  className="btn btn-ghost px-2 py-1 disabled:opacity-20"
                  aria-label="Delete stage"
                  data-testid="stage-delete"
                  disabled={stages.length <= 1}
                  onClick={() => remove(stage)}
                  style={{ color: "var(--danger)" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className="input"
              data-testid="new-stage-name"
              placeholder="New stage name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStage()}
            />
            <button className="btn btn-primary" data-testid="add-stage" disabled={busy || !newName.trim()} onClick={addStage}>
              + Add stage
            </button>
          </div>

          {project && <CustomFieldsManager projectId={project.id} />}
        </div>
      </div>
    </>
  );
}

function CustomFieldsManager({ projectId }: { projectId: string }) {
  const { data: fields, mutate } = useSWR<CustomField[]>(`/api/projects/${projectId}/fields`, fetcher);
  const [name, setName] = useState("");
  const [type, setType] = useState("TEXT");
  const [options, setOptions] = useState("");

  async function add() {
    if (!name.trim()) return;
    await api(`/api/projects/${projectId}/fields`, "POST", {
      name: name.trim(),
      type,
      options: type === "SELECT" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
    setName("");
    setOptions("");
    setType("TEXT");
    mutate();
  }
  async function remove(id: string) {
    await api(`/api/fields/${id}`, "DELETE");
    mutate();
  }

  return (
    <div className="mt-10" data-testid="fields-manager">
      <h2 className="mb-1 text-base font-semibold">Custom fields</h2>
      <p className="mb-4 text-xs" style={{ color: "var(--text-faint)" }}>
        Add your own typed fields (text, number, select, URL). They appear on every item's detail panel.
      </p>

      <div className="flex flex-col gap-2" data-testid="field-list">
        {(fields ?? []).map((f) => (
          <div key={f.id} className="card flex items-center gap-3 p-3" data-testid="field-row" data-name={f.name}>
            <span className="font-medium">{f.name}</span>
            <span className="chip" style={{ background: "var(--bg-elev-2)", color: "var(--text-dim)" }}>
              {FIELD_TYPE_META[f.type as keyof typeof FIELD_TYPE_META]?.label ?? f.type}
            </span>
            {f.type === "SELECT" && (
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                {(JSON.parse(f.options) as string[]).join(", ")}
              </span>
            )}
            <button
              className="btn btn-ghost ml-auto px-2 py-1"
              style={{ color: "var(--danger)" }}
              aria-label="Delete field"
              data-testid="field-delete"
              onClick={() => remove(f.id)}
            >
              ✕
            </button>
          </div>
        ))}
        {fields && fields.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
            No custom fields yet.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="input flex-1"
          data-testid="field-name"
          placeholder="Field name (e.g. Team)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className="input w-auto" data-testid="field-type" value={type} onChange={(e) => setType(e.target.value)}>
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_META[t].label}
            </option>
          ))}
        </select>
        {type === "SELECT" && (
          <input
            className="input flex-1"
            data-testid="field-options"
            placeholder="Options, comma-separated"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
          />
        )}
        <button className="btn btn-primary" data-testid="add-field" disabled={!name.trim()} onClick={add}>
          + Add field
        </button>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-label="Stage color"
        data-testid="stage-color"
        className="h-6 w-6 rounded-md"
        style={{ background: value, border: "1px solid var(--border-strong)" }}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div
          className="card absolute left-0 top-8 z-20 grid grid-cols-5 gap-1.5 p-2"
          onMouseLeave={() => setOpen(false)}
        >
          {SWATCHES.map((c) => (
            <button
              key={c}
              className="h-5 w-5 rounded"
              style={{ background: c, outline: c === value ? "2px solid white" : "none" }}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
