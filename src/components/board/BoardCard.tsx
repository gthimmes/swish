"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WorkItem } from "@/lib/types";
import { Avatar, LabelChip, Meter, PriorityBadge, SpecStatusBadge, TypeBadge } from "@/components/ui";

export function BoardCard({
  item,
  onOpen,
  overlay = false,
}: {
  item: WorkItem;
  onOpen?: (id: string) => void;
  overlay?: boolean;
}) {
  const sortable = useSortable({ id: item.id, data: { item } });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const criteria = item.spec?.criteria ?? [];
  const doneCount = criteria.filter((c) => c.done).length;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      data-testid="board-card"
      data-key={item.key}
      onClick={() => onOpen?.(item.id)}
      className="card group cursor-pointer p-2.5 text-left transition-shadow hover:border-[var(--border-strong)]"
      style={{
        ...(overlay ? {} : style),
        boxShadow: overlay ? "0 12px 28px rgba(0,0,0,0.5)" : undefined,
        rotate: overlay ? "2deg" : undefined,
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <TypeBadge type={item.type} />
        <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
          {item.key}
        </span>
        <span className="ml-auto">
          <PriorityBadge priority={item.priority} />
        </span>
      </div>

      <p className="mb-2 text-sm leading-snug" style={{ color: "var(--text)" }}>
        {item.title}
      </p>

      {item.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {item.labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {item.spec && <SpecStatusBadge status={item.spec.status} />}
        <Meter done={doneCount} total={criteria.length} />
        {item.estimate != null && (
          <span
            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
            style={{ background: "var(--bg-elev-2)", color: "var(--text-dim)" }}
            title={`${item.estimate} points`}
          >
            {item.estimate}
          </span>
        )}
        <span className={item.estimate != null ? "" : "ml-auto"}>
          <Avatar user={item.assignee} />
        </span>
      </div>
    </div>
  );
}
