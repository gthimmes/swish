"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useWorkspace } from "./workspace";
import { fetcher } from "@/lib/client";

const NAV = [
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/board", label: "Board", icon: BoardIcon },
  { href: "/backlog", label: "Backlog", icon: ListIcon },
  { href: "/roadmap", label: "Roadmap", icon: RoadmapIcon },
  { href: "/cycles", label: "Cycles", icon: CyclesIcon },
  { href: "/timeline", label: "Timeline", icon: TimelineIcon },
  { href: "/insights", label: "Insights", icon: InsightsIcon },
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
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--text)" : "var(--text-dim)",
              }}
            >
              <Icon active={active} />
              {item.label}
              {item.href === "/inbox" && <InboxBadge />}
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

function InboxBadge() {
  const { project, currentUser } = useWorkspace();
  const key =
    project && currentUser ? `/api/inbox?projectId=${project.id}&userId=${currentUser.id}` : null;
  const { data } = useSWR<{ assigned: unknown[]; mentions: unknown[] }>(key, fetcher);
  const count = (data?.assigned.length ?? 0) + (data?.mentions.length ?? 0);
  if (!count) return null;
  return (
    <span
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
      style={{ background: "var(--accent)" }}
      data-testid="inbox-badge"
    >
      {count}
    </span>
  );
}

function InboxIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
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
function CyclesIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
function TimelineIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 7h9M3 12h14M3 17h6" />
      <rect x="12" y="5" width="5" height="4" rx="1" />
      <rect x="17" y="10" width="4" height="4" rx="1" />
    </svg>
  );
}
function InsightsIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="12" y="8" width="3" height="10" />
      <rect x="17" y="5" width="3" height="13" />
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
