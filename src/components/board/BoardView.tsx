"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useWorkspace } from "@/components/workspace";
import { useItems, itemsKey, api } from "@/lib/client";
import { useSWRConfig } from "swr";
import type { WorkItem, Stage } from "@/lib/types";
import type { GroupBy } from "@/lib/enums";
import { computeLanes, itemInLane, containerId, parseContainerId, type Lane } from "@/lib/grouping";
import { BoardCard } from "./BoardCard";
import { Dot } from "@/components/ui";
import type { FilterState } from "@/components/Filters";
import { filtersToParams } from "@/components/Filters";

export function BoardView({
  groupBy,
  filters,
}: {
  groupBy: GroupBy;
  filters: FilterState;
}) {
  const { project, users, openItem } = useWorkspace();
  const params = filtersToParams(filters);
  const key = itemsKey(project?.id, params);
  const { data: items } = useItems(project?.id, params);
  const { mutate } = useSWRConfig();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Space picks up / drops; Enter is left free to open the focused card.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  const stages = project?.stages ?? [];
  const lanes = useMemo(
    () => computeLanes(groupBy, items ?? [], users, project),
    [groupBy, items, users, project]
  );

  const activeItem = items?.find((i) => i.id === activeId) ?? null;

  // Cards grouped by lane+stage, sorted by rank.
  const grid = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    if (!items) return map;
    for (const lane of lanes) {
      for (const stage of stages) {
        const cards = items
          .filter((i) => i.stageId === stage.id && itemInLane(i, lane))
          .sort((a, b) => a.rank - b.rank);
        map.set(containerId(lane.key, stage.id), cards);
      }
    }
    return map;
  }, [items, lanes, stages]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !items || !key) return;

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return;

    // Resolve the target container id.
    const overId = String(over.id);
    let targetContainer: string;
    if (overId.includes("::")) {
      targetContainer = overId;
    } else {
      const overItem = items.find((i) => i.id === overId);
      if (!overItem) return;
      const lane = lanes.find((l) => itemInLane(overItem, l));
      targetContainer = containerId(lane?.key ?? "all", overItem.stageId);
    }

    const { laneKey, stageId } = parseContainerId(targetContainer);
    const lane = lanes.find((l) => l.key === laneKey) ?? lanes[0];

    // Ordered target list excluding the active card.
    const originalList = grid.get(targetContainer) ?? [];
    const targetList = originalList.filter((i) => i.id !== activeItem.id);
    let index = targetList.length;
    if (!overId.includes("::")) {
      const overIdx = targetList.findIndex((i) => i.id === overId);
      if (overIdx !== -1) {
        // When reordering within the same column and moving DOWN (active was
        // originally above the over item), insert after it; otherwise before.
        const activeOrig = originalList.findIndex((i) => i.id === activeItem.id);
        const overOrig = originalList.findIndex((i) => i.id === overId);
        const movingDown = activeOrig !== -1 && activeOrig < overOrig;
        index = movingDown ? overIdx + 1 : overIdx;
      }
    }
    const rank = computeRank(targetList, index);

    // Build the field patch for cross-lane moves.
    const patch: Record<string, unknown> = { stageId, rank };
    if (lane.field) patch[lane.field] = lane.value;

    // Skip no-op.
    const unchanged =
      activeItem.stageId === stageId &&
      activeItem.rank === rank &&
      (!lane.field || (activeItem as unknown as Record<string, unknown>)[lane.field] === lane.value);
    if (unchanged) return;

    // Optimistic update.
    const optimistic = items.map((i) =>
      i.id === activeItem.id ? { ...i, ...patchToItem(i, patch, lane) } : i
    );
    mutate(key, optimistic, false);
    try {
      await api(`/api/items/${activeItem.id}`, "PATCH", patch);
    } finally {
      mutate(key);
    }
  }

  if (!project) return null;
  if (!items) return <BoardSkeleton stages={stages} />;

  const showLaneHeaders = groupBy !== "none";

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex-1 overflow-auto p-4" data-testid="board">
        <div className="flex flex-col gap-4" style={{ minWidth: "fit-content" }}>
          {lanes.map((lane) => {
            const laneCount = stages.reduce(
              (n, s) => n + (grid.get(containerId(lane.key, s.id))?.length ?? 0),
              0
            );
            if (showLaneHeaders && laneCount === 0) return null;
            return (
              <div key={lane.key} data-testid="swimlane" data-lane={lane.key}>
                {showLaneHeaders && (
                  <div className="mb-2 flex items-center gap-2 px-1">
                    {lane.color && <Dot color={lane.color} />}
                    <span className="text-sm font-semibold">{lane.label}</span>
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {laneCount}
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  {stages.map((stage) => (
                    <Column
                      key={stage.id}
                      stage={stage}
                      lane={lane}
                      cards={grid.get(containerId(lane.key, stage.id)) ?? []}
                      onOpen={openItem}
                      showLaneHeaders={showLaneHeaders}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>{activeItem ? <BoardCard item={activeItem} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({
  stage,
  lane,
  cards,
  onOpen,
  showLaneHeaders,
}: {
  stage: Stage;
  lane: Lane;
  cards: WorkItem[];
  onOpen: (id: string) => void;
  showLaneHeaders: boolean;
}) {
  const id = containerId(lane.key, stage.id);
  const { setNodeRef, isOver } = useDroppable({ id });
  const overLimit = stage.wipLimit != null && cards.length > stage.wipLimit;

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {!showLaneHeaders && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <Dot color={stage.color} />
          <span className="text-sm font-semibold">{stage.name}</span>
          <span
            className="text-xs"
            style={{ color: overLimit ? "var(--danger)" : "var(--text-faint)" }}
          >
            {cards.length}
            {stage.wipLimit != null && `/${stage.wipLimit}`}
          </span>
        </div>
      )}
      <div
        ref={setNodeRef}
        role="group"
        aria-label={`${stage.name}${showLaneHeaders ? ` — ${lane.label}` : ""}, ${cards.length} item${cards.length === 1 ? "" : "s"}`}
        data-testid="column"
        data-stage={stage.name}
        data-stage-id={stage.id}
        className="flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-2 transition-colors"
        style={{
          background: isOver ? "var(--accent-soft)" : "var(--bg-elev)",
          border: `1px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        {showLaneHeaders && cards.length === 0 && (
          <span className="px-1 py-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
            {stage.name}
          </span>
        )}
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCard key={card.id} item={card} onOpen={onOpen} done={stage.category === "DONE"} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function BoardSkeleton({ stages }: { stages: Stage[] }) {
  return (
    <div className="flex flex-1 gap-3 overflow-hidden p-4">
      {(stages.length ? stages : Array.from({ length: 4 })).map((_, i) => (
        <div key={i} className="flex w-72 flex-col gap-2">
          <div className="h-5 w-24 animate-pulse rounded" style={{ background: "var(--bg-elev-2)" }} />
          {Array.from({ length: 3 }).map((__, j) => (
            <div key={j} className="h-24 animate-pulse rounded-lg" style={{ background: "var(--bg-elev)" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- helpers ---

function computeRank(list: WorkItem[], index: number): number {
  if (list.length === 0) return 1000;
  if (index <= 0) return list[0].rank - 100;
  if (index >= list.length) return list[list.length - 1].rank + 100;
  return (list[index - 1].rank + list[index].rank) / 2;
}

function patchToItem(item: WorkItem, patch: Record<string, unknown>, lane: Lane): Partial<WorkItem> {
  const out: Record<string, unknown> = { stageId: patch.stageId, rank: patch.rank };
  if (lane.field === "assigneeId") {
    out.assigneeId = lane.value;
    out.assignee = null; // assignee object refreshed on revalidate
  } else if (lane.field) {
    out[lane.field] = lane.value;
  }
  return out as Partial<WorkItem>;
}
