"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { BoardView } from "@/components/board/BoardView";
import { PageHeader } from "@/components/PageHeader";
import { Filters, EMPTY_FILTERS, type FilterState } from "@/components/Filters";
import { NewItemButton } from "@/components/NewItemButton";
import { SavedViews } from "@/components/SavedViews";
import { GROUP_BY, type GroupBy } from "@/lib/enums";
import { api } from "@/lib/client";

const GROUP_LABELS: Record<GroupBy, string> = {
  none: "Stage only",
  assignee: "Assignee",
  epic: "Epic",
  priority: "Priority",
  type: "Type",
};

export default function BoardPage() {
  const { project, reloadProject } = useWorkspace();
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // Initialise grouping from the project's saved default.
  useEffect(() => {
    if (project) setGroupBy(project.groupBy);
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeGroupBy(g: GroupBy) {
    setGroupBy(g);
    if (project) {
      await api(`/api/projects/${project.id}`, "PATCH", { groupBy: g });
      reloadProject();
    }
  }

  function applyView(g: GroupBy, f: FilterState) {
    setGroupBy(g);
    setFilters(f);
  }

  return (
    <>
      <PageHeader title="Board">
        <div className="flex items-center gap-1.5">
          <label className="text-xs" style={{ color: "var(--text-faint)" }}>
            Group by
          </label>
          <select
            className="input w-auto"
            data-testid="group-by"
            value={groupBy}
            onChange={(e) => changeGroupBy(e.target.value as GroupBy)}
          >
            {GROUP_BY.map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <Filters value={filters} onChange={setFilters} />
        <SavedViews groupBy={groupBy} filters={filters} onApply={applyView} />
        <NewItemButton />
      </PageHeader>

      <BoardView groupBy={groupBy} filters={filters} />
    </>
  );
}
