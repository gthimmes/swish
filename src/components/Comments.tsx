"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Avatar } from "./ui";
import type { Activity, User, WorkItemDetail } from "@/lib/types";

/** Render a comment body, highlighting @firstname mentions of known users. */
export function MentionText({ body, users }: { body: string; users: User[] }) {
  const firsts = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.name.split(" ")[0].toLowerCase(), u));
    return m;
  }, [users]);
  const parts = body.split(/(@\w+)/g);
  return (
    <>
      {parts.map((p, i) => {
        const key = p.startsWith("@") ? p.slice(1).toLowerCase() : "";
        const u = firsts.get(key);
        if (p.startsWith("@") && u) {
          return (
            <span
              key={i}
              className="rounded px-0.5 font-medium"
              style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
              title={u.name}
              data-testid="mention"
            >
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/** A comment input with @mention autocomplete. */
function Composer({
  users,
  onSubmit,
  placeholder,
  autoFocus,
  testid,
}: {
  users: User[];
  onSubmit: (body: string) => void | Promise<void>;
  placeholder: string;
  autoFocus?: boolean;
  testid: string;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = open
    ? users.filter((u) => u.name.split(" ")[0].toLowerCase().startsWith(query.toLowerCase()))
    : [];

  function onChange(v: string) {
    setValue(v);
    const m = v.match(/(^|\s)@(\w*)$/);
    if (m) {
      setOpen(true);
      setQuery(m[2]);
      setIdx(0);
    } else {
      setOpen(false);
    }
  }

  function insertMention(u: User) {
    const first = u.name.split(" ")[0];
    setValue((prev) => prev.replace(/(^|\s)@(\w*)$/, (_m, lead) => `${lead}@${first} `));
    setOpen(false);
    inputRef.current?.focus();
  }

  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit(value.trim());
      setValue("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          className="input"
          data-testid={`${testid}-input`}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (open && matches.length) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(matches[idx]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            } else if (e.key === "Enter") {
              submit();
            }
          }}
        />
        {open && matches.length > 0 && (
          <ul
            className="card absolute left-0 top-10 z-50 w-56 overflow-hidden p-1 shadow-xl"
            style={{ background: "var(--bg-elev)" }}
            data-testid={`${testid}-mentions`}
          >
            {matches.map((u, i) => (
              <li key={u.id}>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                  style={{ background: i === idx ? "var(--accent-soft)" : "transparent" }}
                  data-testid="mention-option"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => insertMention(u)}
                >
                  <Avatar user={u} size={20} />
                  {u.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="btn btn-outline" data-testid={`${testid}-send`} disabled={busy} onClick={submit}>
        Send
      </button>
    </div>
  );
}

function ActivityRow({ a, users }: { a: Activity; users: User[] }) {
  return (
    <div className="flex gap-2.5 text-sm" data-testid={a.kind === "event" ? "activity-event" : "activity-comment"}>
      <Avatar user={a.user} size={22} />
      <div className="min-w-0">
        <div style={{ color: a.kind === "event" ? "var(--text-faint)" : "var(--text)" }}>
          {a.kind === "event" ? <em>{a.body}</em> : <MentionText body={a.body} users={users} />}
        </div>
        <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>
          {a.user?.name ?? "system"} · {new Date(a.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function ActivityThread({ item, users, onChanged }: { item: WorkItemDetail; users: User[]; onChanged: () => void }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const top = item.activity.filter((a) => !a.parentId);
  const repliesByParent = useMemo(() => {
    const m = new Map<string, Activity[]>();
    item.activity.forEach((a) => {
      if (a.parentId) {
        const arr = m.get(a.parentId) ?? [];
        arr.push(a);
        m.set(a.parentId, arr);
      }
    });
    return m;
  }, [item.activity]);

  async function comment(body: string, parentId: string | null) {
    await api(`/api/items/${item.id}/activity`, "POST", { body, parentId });
    setReplyTo(null);
    onChanged();
  }

  return (
    <div data-testid="activity-feed">
      <div className="mb-4">
        <Composer users={users} onSubmit={(b) => comment(b, null)} placeholder="Comment… use @ to mention" testid="comment" />
      </div>
      <ul className="flex flex-col gap-3">
        {top.map((a) => {
          const replies = repliesByParent.get(a.id) ?? [];
          return (
            <li key={a.id}>
              <ActivityRow a={a} users={users} />
              {a.kind === "comment" && (
                <div className="ml-8 mt-1">
                  {replies.length > 0 && (
                    <ul className="flex flex-col gap-2 border-l pl-3" style={{ borderColor: "var(--border)" }} data-testid="replies">
                      {replies.map((r) => (
                        <li key={r.id}>
                          <ActivityRow a={r} users={users} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {replyTo === a.id ? (
                    <div className="mt-2">
                      <Composer
                        users={users}
                        onSubmit={(b) => comment(b, a.id)}
                        placeholder="Reply…"
                        testid="reply"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-faint)" }}
                      data-testid="reply-button"
                      onClick={() => setReplyTo(a.id)}
                    >
                      Reply
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
