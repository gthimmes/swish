"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { buildPrDraft } from "@/lib/brief";
import type { WorkItemDetail } from "@/lib/types";

export function PrDraftButton({ item }: { item: WorkItemDetail }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const draft = buildPrDraft(item);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // clipboard may be unavailable; the text is still visible to copy manually
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([draft], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.key}-pr.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        className="btn btn-ghost px-2 py-1"
        aria-label="Draft pull-request description"
        title="Draft a PR description & checklist from this spec"
        data-testid="pr-draft-open"
        onClick={() => {
          setOpen(true);
          setCopied(false);
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="6" cy="18" r="2.4" />
          <circle cx="18" cy="18" r="2.4" />
          <path d="M6 8.4v7.2" />
          <path d="M18 15.6V12a4 4 0 0 0-4-4H9" />
          <path d="M11 6h-2m0 0 2-2m-2 2 2 2" />
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Draft PR description" width={620}>
        <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
          A ready-to-paste pull-request body — summary, implementation notes, and your acceptance
          criteria and test plan as review checklists.
        </p>
        <pre
          className="max-h-[52vh] overflow-auto rounded-md p-3 text-xs leading-relaxed"
          style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}
          data-testid="pr-draft"
        >
          {draft}
        </pre>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn btn-outline" data-testid="pr-draft-download" onClick={download}>
            Download .md
          </button>
          <button className="btn btn-primary" data-testid="pr-draft-copy" onClick={copy}>
            {copied ? "Copied!" : "Copy PR body"}
          </button>
        </div>
      </Modal>
    </>
  );
}
