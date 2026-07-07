"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { buildAgentBrief } from "@/lib/brief";
import type { WorkItemDetail } from "@/lib/types";

export function AgentBriefButton({ item }: { item: WorkItemDetail }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const brief = buildAgentBrief(item);

  async function copy() {
    try {
      await navigator.clipboard.writeText(brief);
    } catch {
      // clipboard may be unavailable; the text is still visible to copy manually
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([brief], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.key}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        className="btn btn-ghost px-2 py-1"
        aria-label="Export AI-ready brief"
        title="Copy an AI-ready task brief"
        data-testid="agent-brief-open"
        onClick={() => {
          setOpen(true);
          setCopied(false);
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="AI-ready task brief" width={620}>
        <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
          A self-contained packet — spec, acceptance criteria, and test plan — ready to hand to a coding agent.
        </p>
        <pre
          className="max-h-[52vh] overflow-auto rounded-md p-3 text-xs leading-relaxed"
          style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}
          data-testid="agent-brief"
        >
          {brief}
        </pre>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn btn-outline" data-testid="agent-brief-download" onClick={download}>
            Download .md
          </button>
          <button className="btn btn-primary" data-testid="agent-brief-copy" onClick={copy}>
            {copied ? "Copied!" : "Copy brief"}
          </button>
        </div>
      </Modal>
    </>
  );
}
