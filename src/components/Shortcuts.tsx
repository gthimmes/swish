"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Global keyboard shortcuts:
 *   c        → new item
 *   /        → focus search
 *   g then b → board, g l → backlog, g s → specs, g w → workflow
 */
export function Shortcuts() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let awaitingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const suffix = () => {
      const p = params.get("project");
      return p ? `?project=${p}` : "";
    };

    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      if (awaitingG) {
        awaitingG = false;
        if (gTimer) clearTimeout(gTimer);
        const routes: Record<string, string> = { b: "/board", l: "/backlog", s: "/specs", w: "/settings" };
        const dest = routes[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          router.push(`${dest}${suffix()}`);
        }
        return;
      }

      if (e.key === "g") {
        awaitingG = true;
        gTimer = setTimeout(() => (awaitingG = false), 800);
        return;
      }
      if (e.key === "c") {
        e.preventDefault();
        window.dispatchEvent(new Event("swish:new-item"));
      } else if (e.key === "/") {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('[data-testid="filter-search"]');
        search?.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [router, params]);

  return null;
}
