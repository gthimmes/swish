"use client";

import { useMemo, useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { useItems } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Meter, TypeBadge } from "@/components/ui";
import { SPEC_STATUSES, SPEC_STATUS_META, type SpecStatus } from "@/lib/enums";
import type { WorkItem } from "@/lib/types";

export default function SpecsPage() {
  const { project, openItem } = useWorkspace();
  const { data: items } = useItems(project?.id);
  const [statusFilter, setStatusFilter] = useState<SpecStatus | "ALL">("ALL");

  const withSpecs = useMemo(
    () => (items ?? []).filter((i) => i.spec).filter((i) => statusFilter === "ALL" || i.spec!.status === statusFilter),
    [items, statusFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: 0, DRAFT: 0, IN_REVIEW: 0, APPROVED: 0 };
    (items ?? []).forEach((i) => {
      if (i.spec) {
        c.ALL++;
        c[i.spec.status]++;
      }
    });
    return c;
  }, [items]);

  return (
    <>
      <PageHeader title="Specs" count={counts.ALL}>
        <div className="flex items-center gap-1" data-testid="spec-status-filter">
          <FilterPill active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} label={`All (${counts.ALL})`} />
          {SPEC_STATUSES.map((s) => (
            <FilterPill
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={`${SPEC_STATUS_META[s].label} (${counts[s]})`}
              color={SPEC_STATUS_META[s].color}
            />
          ))}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
          {withSpecs.map((item) => (
            <SpecCard key={item.id} item={item} onOpen={() => openItem(item.id)} />
          ))}
        </div>
        {withSpecs.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
            No specs {statusFilter !== "ALL" ? `with status ${SPEC_STATUS_META[statusFilter].label}` : "yet"}.
          </div>
        )}
      </div>
    </>
  );
}

function SpecCard({ item, onOpen }: { item: WorkItem; onOpen: () => void }) {
  const spec = item.spec!;
  const done = spec.criteria.filter((c) => c.done).length;
  const testPass = spec.tests.filter((t) => t.status === "PASS").length;
  const m = SPEC_STATUS_META[spec.status];
  return (
    <button
      className="card p-4 text-left transition-colors hover:border-[var(--border-strong)]"
      data-testid="spec-card"
      data-key={item.key}
      onClick={onOpen}
    >
      <div className="mb-2 flex items-center gap-2">
        <TypeBadge type={item.type} />
        <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
          {item.key}
        </span>
        <span
          className="chip ml-auto"
          style={{ background: `${m.color}22`, color: m.color, border: `1px solid ${m.color}44` }}
        >
          {m.label}
        </span>
      </div>
      <p className="mb-3 font-medium leading-snug">{item.title}</p>
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-dim)" }}>
        <Meter done={done} total={spec.criteria.length} />
        {spec.tests.length > 0 && (
          <span title="Tests passing">
            🧪 {testPass}/{spec.tests.length}
          </span>
        )}
        <span className="ml-auto">
          <Avatar user={item.assignee} size={22} />
        </span>
      </div>
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  color = "var(--accent)",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        background: active ? `${color}22` : "transparent",
        color: active ? color : "var(--text-dim)",
        border: `1px solid ${active ? `${color}55` : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}
