"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/components/workspace";
import { fetcher } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import { MentionText } from "@/components/Comments";
import { Avatar, DueChip, PriorityBadge, TypeBadge } from "@/components/ui";
import type { WorkItem } from "@/lib/types";

type Mention = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; initials: string; color: string } | null;
  workItem: { id: string; key: string; title: string };
};
type InboxData = { assigned: WorkItem[]; mentions: Mention[] };

export default function InboxPage() {
  const { project, currentUser, users, openItem } = useWorkspace();
  const key =
    project && currentUser ? `/api/inbox?projectId=${project.id}&userId=${currentUser.id}` : null;
  const { data } = useSWR<InboxData>(key, fetcher);

  const stageMap = useMemo(
    () => new Map((project?.stages ?? []).map((s) => [s.id, s])),
    [project]
  );
  const doneIds = useMemo(
    () => new Set((project?.stages ?? []).filter((s) => s.category === "DONE").map((s) => s.id)),
    [project]
  );

  const assigned = data?.assigned ?? [];
  const mentions = data?.mentions ?? [];

  return (
    <>
      <PageHeader title="Inbox">
        {currentUser && (
          <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
            <Avatar user={currentUser} size={22} /> {currentUser.name}
          </span>
        )}
      </PageHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <section data-testid="inbox-assigned">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Assigned to you
              <span className="text-xs" style={{ color: "var(--text-faint)" }} data-testid="assigned-count">
                {assigned.length}
              </span>
            </h3>
            {assigned.length === 0 ? (
              <Empty>Nothing assigned that's still open. Nice.</Empty>
            ) : (
              <ul className="flex flex-col gap-1">
                {assigned.map((it) => {
                  const stage = stageMap.get(it.stageId);
                  return (
                    <li
                      key={it.id}
                      className="card flex cursor-pointer items-center gap-2 p-2.5 hover:border-[var(--border-strong)]"
                      data-testid="inbox-item"
                      data-key={it.key}
                      onClick={() => openItem(it.id)}
                    >
                      <TypeBadge type={it.type} />
                      <span className="font-mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {it.key}
                      </span>
                      <span className="truncate text-sm">{it.title}</span>
                      <span className="ml-auto flex items-center gap-2">
                        <PriorityBadge priority={it.priority} />
                        <DueChip due={it.dueDate} done={doneIds.has(it.stageId)} />
                        {stage && (
                          <span
                            className="chip"
                            style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}44` }}
                          >
                            {stage.name}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section data-testid="inbox-mentions">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Mentions
              <span className="text-xs" style={{ color: "var(--text-faint)" }} data-testid="mentions-count">
                {mentions.length}
              </span>
            </h3>
            {mentions.length === 0 ? (
              <Empty>No mentions yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-1">
                {mentions.map((mn) => (
                  <li
                    key={mn.id}
                    className="card flex cursor-pointer gap-2.5 p-2.5 hover:border-[var(--border-strong)]"
                    data-testid="inbox-mention"
                    data-key={mn.workItem.key}
                    onClick={() => openItem(mn.workItem.id)}
                  >
                    <Avatar user={mn.user} size={22} />
                    <div className="min-w-0">
                      <div className="text-sm">
                        <MentionText body={mn.body} users={users} />
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {mn.user?.name ?? "system"} on <span className="font-mono">{mn.workItem.key}</span> ·{" "}
                        {new Date(mn.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-6 text-center text-sm" style={{ background: "var(--bg-elev)", color: "var(--text-faint)" }}>
      {children}
    </div>
  );
}
