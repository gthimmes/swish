"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useProject, useProjects, useUsers } from "@/lib/client";
import type { Project, ProjectSummary, User } from "@/lib/types";

type WorkspaceCtx = {
  projects: ProjectSummary[];
  project: Project | undefined;
  projectId: string | undefined;
  users: User[];
  loading: boolean;
  reloadProject: () => void;
  selectProject: (id: string) => void;
  openItem: (id: string | null) => void;
  openItemId: string | null;
};

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const { data: projects } = useProjects();
  const projectId = params.get("project") ?? projects?.[0]?.id;
  const { data: project, mutate: mutateProject } = useProject(projectId);
  const { data: users } = useUsers();

  const openItemId = params.get("item");

  const value = useMemo<WorkspaceCtx>(() => {
    function setParam(key: string, val: string | null) {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (val === null) next.delete(key);
      else next.set(key, val);
      const qs = next.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }
    return {
      projects: projects ?? [],
      project,
      projectId,
      users: users ?? [],
      loading: !projects || !project,
      reloadProject: () => mutateProject(),
      selectProject: (id) => setParam("project", id),
      openItem: (id) => setParam("item", id),
      openItemId,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, project, projectId, users, openItemId, pathname, params]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
