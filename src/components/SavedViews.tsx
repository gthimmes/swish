"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, api } from "@/lib/client";
import { useWorkspace } from "./workspace";
import { Modal } from "./Modal";

import type { FilterState } from "./Filters";
import { EMPTY_FILTERS, hasActiveFilters } from "./Filters";

type SavedView = { id: string; name: string; groupBy: string; filters: string };

export function SavedViews({
  groupBy,
  filters,
  onApply,
}: {
  groupBy: string;
  filters: FilterState;
  onApply: (groupBy: string, filters: FilterState) => void;
}) {
  const { project } = useWorkspace();
  const key = project ? `/api/projects/${project.id}/views` : null;
  const { data: views, mutate } = useSWR<SavedView[]>(key, fetcher);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  async function saveView() {
    if (!name.trim() || !project) return;
    await api(`/api/projects/${project.id}/views`, "POST", { name: name.trim(), groupBy, filters });
    setName("");
    setSaving(false);
    mutate();
  }

  async function remove(id: string) {
    await api(`/api/views/${id}`, "DELETE");
    mutate();
  }

  function apply(v: SavedView) {
    let f: FilterState = EMPTY_FILTERS;
    try {
      f = { ...EMPTY_FILTERS, ...(JSON.parse(v.filters) as Partial<FilterState>) };
    } catch {}
    onApply(v.groupBy, f);
    setOpen(false);
  }

  const canSave = groupBy !== "none" || hasActiveFilters(filters);

  return (
    <div className="relative">
      <button className="btn btn-outline" data-testid="views-button" onClick={() => setOpen((o) => !o)}>
        <SavedIcon /> Views
        {views && views.length > 0 && (
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {views.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="card absolute right-0 top-9 z-40 w-60 p-1.5 shadow-xl"
            style={{ background: "var(--bg-elev)" }}
            data-testid="views-menu"
          >
            {views && views.length > 0 ? (
              <ul className="flex flex-col">
                {views.map((v) => (
                  <li key={v.id} className="group flex items-center rounded-md hover:bg-[var(--bg-elev-2)]" data-testid="saved-view">
                    <button className="flex-1 truncate px-2 py-1.5 text-left text-sm" data-view-name={v.name} onClick={() => apply(v)}>
                      {v.name}
                    </button>
                    <button
                      className="px-2 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: "var(--text-faint)" }}
                      aria-label={`Delete view ${v.name}`}
                      data-testid="delete-view"
                      onClick={() => remove(v.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-3 text-center text-xs" style={{ color: "var(--text-faint)" }}>
                No saved views yet.
              </p>
            )}
            <div className="mt-1 border-t pt-1" style={{ borderColor: "var(--border)" }}>
              <button
                className="w-full rounded-md px-2 py-1.5 text-left text-sm disabled:opacity-40"
                style={{ color: "var(--accent)" }}
                data-testid="save-view"
                disabled={!canSave}
                title={canSave ? "" : "Set a grouping or filter first"}
                onClick={() => {
                  setSaving(true);
                  setOpen(false);
                }}
              >
                + Save current view
              </button>
            </div>
          </div>
        </>
      )}

      <Modal open={saving} onClose={() => setSaving(false)} title="Save view" width={380}>
        <div className="flex flex-col gap-3">
          <input
            className="input"
            autoFocus
            data-testid="view-name-input"
            placeholder="View name (e.g. My urgent bugs)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveView()}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" onClick={() => setSaving(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" data-testid="view-save-submit" disabled={!name.trim()} onClick={saveView}>
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SavedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3h11l3 3v15l-7-4-7 4V3z" />
    </svg>
  );
}
