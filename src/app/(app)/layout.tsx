import { Suspense } from "react";
import { WorkspaceProvider } from "@/components/workspace";
import { Sidebar } from "@/components/Sidebar";
import { ItemDrawer } from "@/components/ItemDrawer";
import { Shortcuts } from "@/components/Shortcuts";
import { CommandPalette } from "@/components/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--text-dim)]">Loading workspace…</div>}>
      <WorkspaceProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
          <ItemDrawer />
          <Shortcuts />
          <CommandPalette />
        </div>
      </WorkspaceProvider>
    </Suspense>
  );
}
