"use client";

import type { User } from "@/lib/types";
import { PRIORITY_META, SPEC_STATUS_META, TYPE_META } from "@/lib/enums";
import type { ItemType, Priority, SpecStatus } from "@/lib/enums";

export function Avatar({ user, size = 24 }: { user: User | null; size?: number }) {
  if (!user) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full text-[10px] font-medium"
        style={{
          width: size,
          height: size,
          background: "var(--bg-elev-2)",
          color: "var(--text-faint)",
          border: "1px dashed var(--border-strong)",
        }}
        title="Unassigned"
      >
        —
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}
      title={user.name}
    >
      {user.initials}
    </span>
  );
}

export function TypeBadge({ type, showLabel = false }: { type: ItemType; showLabel?: boolean }) {
  const m = TYPE_META[type];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: m.color }} title={m.label}>
      <span aria-hidden>{m.icon}</span>
      {showLabel && <span>{m.label}</span>}
    </span>
  );
}

export function PriorityBadge({ priority, showLabel = false }: { priority: Priority; showLabel?: boolean }) {
  const m = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: m.color }} title={`${m.label} priority`}>
      <span aria-hidden>{m.icon}</span>
      {showLabel && <span>{m.label}</span>}
    </span>
  );
}

export function SpecStatusBadge({ status }: { status: SpecStatus }) {
  const m = SPEC_STATUS_META[status];
  return (
    <span
      className="chip"
      style={{ background: `${m.color}22`, color: m.color, border: `1px solid ${m.color}44` }}
    >
      {m.label}
    </span>
  );
}

export function LabelChip({ label }: { label: { name: string; color: string } }) {
  return (
    <span
      className="chip"
      style={{ background: `${label.color}1f`, color: label.color, border: `1px solid ${label.color}3a` }}
    >
      {label.name}
    </span>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: color }}
    />
  );
}

/** Small progress meter for acceptance criteria. */
export function Meter({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const complete = done === total;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-dim)" }} title="Acceptance criteria">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <rect x="1" y="1" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        {complete && <path d="M3.5 6.2 L5.2 8 L8.5 4.2" fill="none" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <span style={{ color: complete ? "#22c55e" : "var(--text-dim)" }}>
        {done}/{total}
      </span>
      <span className="sr-only">{pct}% complete</span>
    </span>
  );
}
