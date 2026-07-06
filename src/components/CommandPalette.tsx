"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "./workspace";
import { useItems } from "@/lib/client";
import { TypeBadge } from "./ui";
import type { WorkItem } from "@/lib/types";

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Actions" | "Items";
  run: () => void;
  item?: WorkItem;
};

/** Fuzzy subsequence match; returns a score (lower = better) or -1 for no match. */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const idx = t.indexOf(q);
  if (idx !== -1) return idx; // contiguous match ranks best, earlier is better
  // subsequence
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    ti = t.indexOf(q[qi], ti);
    if (ti === -1) return -1;
    ti++;
  }
  return 100; // matched as subsequence
}

export function CommandPalette() {
  const router = useRouter();
  const params = useSearchParams();
  const { project, openItem } = useWorkspace();
  const { data: items } = useItems(project?.id);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suffix = () => {
    const p = params.get("project");
    return p ? `?project=${p}` : "";
  };

  // Cmd/Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: "nav-board", label: "Go to Board", group: "Navigate", run: () => router.push(`/board${suffix()}`) },
      { id: "nav-backlog", label: "Go to Backlog", group: "Navigate", run: () => router.push(`/backlog${suffix()}`) },
      { id: "nav-roadmap", label: "Go to Roadmap", group: "Navigate", run: () => router.push(`/roadmap${suffix()}`) },
      { id: "nav-insights", label: "Go to Insights", group: "Navigate", run: () => router.push(`/insights${suffix()}`) },
      { id: "nav-specs", label: "Go to Specs", group: "Navigate", run: () => router.push(`/specs${suffix()}`) },
      { id: "nav-workflow", label: "Go to Workflow", group: "Navigate", run: () => router.push(`/settings${suffix()}`) },
    ];
    const actions: Command[] = [
      {
        id: "act-new",
        label: "Create work item",
        hint: "c",
        group: "Actions",
        run: () => window.dispatchEvent(new Event("swish:new-item")),
      },
    ];
    const itemCmds: Command[] = (items ?? []).map((it) => ({
      id: `item-${it.id}`,
      label: `${it.key}  ${it.title}`,
      group: "Items",
      item: it,
      run: () => openItem(it.id),
    }));
    return [...nav, ...actions, ...itemCmds];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, router, params]);

  const results = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, s: fuzzyScore(query, c.item ? `${c.item.key} ${c.item.title}` : c.label) }))
      .filter((x) => x.s !== -1);
    scored.sort((a, b) => a.s - b.s);
    // Cap items so the list stays tight.
    const navActions = scored.filter((x) => x.c.group !== "Items");
    const itemsMatched = scored.filter((x) => x.c.group === "Items").slice(0, query ? 8 : 5);
    return [...navActions, ...itemsMatched].map((x) => x.c);
  }, [commands, query]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results.length, active]);

  function activate(cmd: Command | undefined) {
    if (!cmd) return;
    cmd.run();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[14vh]"
      style={{ background: "rgba(4,6,10,0.6)" }}
      onClick={() => setOpen(false)}
      data-testid="command-palette"
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="card w-full max-w-xl overflow-hidden shadow-2xl"
        style={{ background: "var(--bg-elev)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full bg-transparent px-4 py-3 text-sm outline-none"
          style={{ borderBottom: "1px solid var(--border)" }}
          placeholder="Search items, jump to a view, run an action…"
          aria-label="Command palette search"
          data-testid="command-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              activate(results[active]);
            }
          }}
        />
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-faint)" }}>
              No matches
            </li>
          )}
          {results.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm"
                data-testid="command-item"
                data-active={i === active}
                style={{ background: i === active ? "var(--accent-soft)" : "transparent" }}
                onMouseEnter={() => setActive(i)}
                onClick={() => activate(cmd)}
              >
                {cmd.item ? (
                  <>
                    <TypeBadge type={cmd.item.type} />
                    <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                      {cmd.item.key}
                    </span>
                    <span className="truncate">{cmd.item.title}</span>
                  </>
                ) : (
                  <>
                    <span
                      className="text-[10px] font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-faint)", minWidth: 56 }}
                    >
                      {cmd.group}
                    </span>
                    <span>{cmd.label}</span>
                  </>
                )}
                {cmd.hint && (
                  <kbd
                    className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
                    style={{ background: "var(--bg-elev-2)", color: "var(--text-faint)" }}
                  >
                    {cmd.hint}
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
