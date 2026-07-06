"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useWorkspace } from "./workspace";

const NAV = [
  { href: "/board", label: "Board", icon: BoardIcon },
  { href: "/backlog", label: "Backlog", icon: ListIcon },
  { href: "/roadmap", label: "Roadmap", icon: RoadmapIcon },
  { href: "/specs", label: "Specs", icon: SpecIcon },
  { href: "/settings", label: "Workflow", icon: GearIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { projects, projectId, selectProject } = useWorkspace();

  const project = params.get("project");
  const suffix = project ? `?project=${project}` : "";

  return (
    <aside
      className="flex h-full w-60 shrink-0 flex-col gap-1 px-3 py-4"
      style={{ background: "var(--bg-elev)", borderRight: "1px solid var(--border)" }}
    >
      <Link href={`/board${suffix}`} className="mb-4 flex items-center gap-2 px-2">
        <Logo />
        <span className="text-lg font-semibold tracking-tight">Swish</span>
      </Link>

      <div className="mb-3 px-1">
        <label className="mb-1 block px-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
          Project
        </label>
        <select
          aria-label="Select project"
          className="input"
          value={projectId ?? ""}
          onChange={(e) => selectProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--text)" : "var(--text-dim)",
              }}
            >
              <Icon active={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-4 text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
        Spec-first work tracking.
        <br />
        Methodology-agnostic by design.
      </div>
    </aside>
  );
}

function Logo() {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M6 15c0 2 2 3 4 3s4-1 4-3-2-2.5-4-3-4-1-4-3 2-3 4-3 4 1 4 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function iconProps(active?: boolean) {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: active ? "var(--accent)" : "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function BoardIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="11" rx="1" />
      <rect x="17" y="4" width="5" height="14" rx="1" />
    </svg>
  );
}
function ListIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function RoadmapIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 6h10M4 12h16M4 18h7" />
      <circle cx="18" cy="6" r="1.6" />
      <circle cx="14" cy="18" r="1.6" />
    </svg>
  );
}
function SpecIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13l2 2 4-4" />
    </svg>
  );
}
function GearIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 6.6 19.4a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4 13.6a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 6.6a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4h.09A1.65 1.65 0 0 0 12.4 2.6a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 19 4.6a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21.4 11H21a2 2 0 1 1 0 4z" />
    </svg>
  );
}
