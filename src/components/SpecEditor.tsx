"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { SPEC_STATUSES, SPEC_STATUS_META, TEST_STATUSES } from "@/lib/enums";
import type { Spec, WorkItemDetail } from "@/lib/types";
import { Meter } from "./ui";

const SECTIONS: { key: keyof Pick<Spec, "problem" | "goals" | "nonGoals" | "approach" | "risks">; label: string; hint: string }[] = [
  { key: "problem", label: "Problem & Context", hint: "Why does this work exist? What's the situation?" },
  { key: "goals", label: "Goals", hint: "What must be true when this is done?" },
  { key: "nonGoals", label: "Non-Goals", hint: "Explicitly out of scope." },
  { key: "approach", label: "Technical Approach", hint: "How will it be built? Key decisions." },
  { key: "risks", label: "Risks & Open Questions", hint: "What could go wrong or is undecided?" },
];

export function SpecEditor({ item, onChanged }: { item: WorkItemDetail; onChanged: () => void }) {
  const [spec, setSpec] = useState<Spec | null>(item.spec);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSpec(item.spec);
  }, [item.id, item.spec]);

  const saveSpec = useDebouncedCallback(async (patch: Partial<Spec>) => {
    setSaving(true);
    try {
      await api(`/api/items/${item.id}/spec`, "PUT", patch);
      onChanged();
    } finally {
      setSaving(false);
    }
  }, 500);

  async function createSpec() {
    const created = await api<Spec>(`/api/items/${item.id}/spec`, "PUT", {});
    setSpec(created);
    onChanged();
  }

  if (!spec) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg py-10 text-center" style={{ background: "var(--bg-elev)" }}>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          No spec yet. A precise spec is the highest-leverage artifact for AI-assisted work.
        </p>
        <button className="btn btn-primary" data-testid="create-spec" onClick={createSpec}>
          + Draft a spec
        </button>
      </div>
    );
  }

  const doneCount = spec.criteria.filter((c) => c.done).length;

  function update(patch: Partial<Spec>) {
    setSpec((s) => (s ? { ...s, ...patch } : s));
    saveSpec(patch);
  }

  return (
    <div className="flex flex-col gap-5" data-testid="spec-editor">
      {/* Status + progress */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            Spec status
          </span>
          <select
            className="input w-auto"
            data-testid="spec-status"
            value={spec.status}
            onChange={(e) => update({ status: e.target.value as Spec["status"] })}
            style={{ color: SPEC_STATUS_META[spec.status].color }}
          >
            {SPEC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SPEC_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: "var(--text-faint)" }}>
          <Meter done={doneCount} total={spec.criteria.length} />
          <span data-testid="save-indicator">{saving ? "Saving…" : "Saved"}</span>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((sec) => (
        <div key={sec.key}>
          <label className="mb-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold">{sec.label}</span>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              {sec.hint}
            </span>
          </label>
          <textarea
            className="input min-h-16 resize-y font-[inherit] leading-relaxed"
            data-testid={`spec-${sec.key}`}
            value={spec[sec.key]}
            placeholder="—"
            onChange={(e) => update({ [sec.key]: e.target.value } as Partial<Spec>)}
          />
        </div>
      ))}

      <AcceptanceCriteria item={item} spec={spec} setSpec={setSpec} onChanged={onChanged} />
      <TestPlan item={item} spec={spec} setSpec={setSpec} onChanged={onChanged} />
    </div>
  );
}

function AcceptanceCriteria({
  item,
  spec,
  setSpec,
  onChanged,
}: {
  item: WorkItemDetail;
  spec: Spec;
  setSpec: React.Dispatch<React.SetStateAction<Spec | null>>;
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const done = spec.criteria.filter((c) => c.done).length;

  async function add() {
    if (!text.trim()) return;
    const created = await api(`/api/items/${item.id}/criteria`, "POST", { text: text.trim() });
    setSpec((s) => (s ? { ...s, criteria: [...s.criteria, created as Spec["criteria"][number]] } : s));
    setText("");
    onChanged();
  }
  async function toggle(id: string, doneNow: boolean) {
    setSpec((s) => (s ? { ...s, criteria: s.criteria.map((c) => (c.id === id ? { ...c, done: doneNow } : c)) } : s));
    await api(`/api/criteria/${id}`, "PATCH", { done: doneNow });
    onChanged();
  }
  async function remove(id: string) {
    setSpec((s) => (s ? { ...s, criteria: s.criteria.filter((c) => c.id !== id) } : s));
    await api(`/api/criteria/${id}`, "DELETE");
    onChanged();
  }

  return (
    <section data-testid="acceptance-criteria">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold">Acceptance Criteria</h4>
        <span className="text-xs" style={{ color: done === spec.criteria.length && spec.criteria.length > 0 ? "#22c55e" : "var(--text-faint)" }}>
          {done}/{spec.criteria.length}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {spec.criteria.map((c) => (
          <li key={c.id} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="criterion">
            <input
              type="checkbox"
              className="mt-0.5"
              data-testid="criterion-toggle"
              checked={c.done}
              onChange={(e) => toggle(c.id, e.target.checked)}
            />
            <span
              className="flex-1 text-sm leading-snug"
              style={{ color: c.done ? "var(--text-faint)" : "var(--text)", textDecoration: c.done ? "line-through" : "none" }}
            >
              {c.text}
            </span>
            <button
              className="opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--text-faint)" }}
              aria-label="Delete criterion"
              onClick={() => remove(c.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className="input"
          data-testid="criterion-input"
          placeholder="Given / When / Then…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button className="btn btn-outline" data-testid="criterion-add" onClick={add}>
          Add
        </button>
      </div>
    </section>
  );
}

function TestPlan({
  item,
  spec,
  setSpec,
  onChanged,
}: {
  item: WorkItemDetail;
  spec: Spec;
  setSpec: React.Dispatch<React.SetStateAction<Spec | null>>;
  onChanged: () => void;
}) {
  const [text, setText] = useState("");

  const STATUS_STYLE: Record<string, { label: string; color: string }> = {
    TODO: { label: "○ Todo", color: "var(--text-faint)" },
    PASS: { label: "✓ Pass", color: "#22c55e" },
    FAIL: { label: "✕ Fail", color: "#ef4444" },
  };

  async function add() {
    if (!text.trim()) return;
    const created = await api(`/api/items/${item.id}/tests`, "POST", { text: text.trim() });
    setSpec((s) => (s ? { ...s, tests: [...s.tests, created as Spec["tests"][number]] } : s));
    setText("");
    onChanged();
  }
  async function cycle(id: string, current: string) {
    const idx = TEST_STATUSES.indexOf(current as (typeof TEST_STATUSES)[number]);
    const next = TEST_STATUSES[(idx + 1) % TEST_STATUSES.length];
    setSpec((s) => (s ? { ...s, tests: s.tests.map((t) => (t.id === id ? { ...t, status: next } : t)) } : s));
    await api(`/api/tests/${id}`, "PATCH", { status: next });
    onChanged();
  }
  async function remove(id: string) {
    setSpec((s) => (s ? { ...s, tests: s.tests.filter((t) => t.id !== id) } : s));
    await api(`/api/tests/${id}`, "DELETE");
    onChanged();
  }

  return (
    <section data-testid="test-plan">
      <h4 className="mb-2 text-sm font-semibold">Test Plan</h4>
      <ul className="flex flex-col gap-1">
        {spec.tests.map((t) => (
          <li key={t.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="test-item">
            <button
              className="w-16 shrink-0 rounded px-1.5 py-0.5 text-left text-xs font-medium"
              data-testid="test-status"
              style={{ color: STATUS_STYLE[t.status].color, background: "var(--bg-elev-2)" }}
              onClick={() => cycle(t.id, t.status)}
            >
              {STATUS_STYLE[t.status].label}
            </button>
            <span className="flex-1 text-sm leading-snug">{t.text}</span>
            <button
              className="opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--text-faint)" }}
              aria-label="Delete test"
              onClick={() => remove(t.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className="input"
          data-testid="test-input"
          placeholder="Test scenario…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button className="btn btn-outline" data-testid="test-add" onClick={add}>
          Add
        </button>
      </div>
    </section>
  );
}
