"use client";

import useSWR from "swr";
import type { Project, ProjectSummary, User, WorkItem, WorkItemDetail } from "./types";

export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });

export async function api<T = unknown>(
  url: string,
  method: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useProjects() {
  return useSWR<ProjectSummary[]>("/api/projects", fetcher);
}

export function useProject(id: string | undefined) {
  return useSWR<Project>(id ? `/api/projects/${id}` : null, fetcher);
}

export function useUsers() {
  return useSWR<User[]>("/api/users", fetcher);
}

export function itemsKey(projectId: string | undefined, params?: Record<string, string>) {
  if (!projectId) return null;
  const search = new URLSearchParams({ projectId, ...params });
  return `/api/items?${search.toString()}`;
}

export function useItems(projectId: string | undefined, params?: Record<string, string>) {
  // keepPreviousData avoids a flash of empty content while a filtered query loads.
  return useSWR<WorkItem[]>(itemsKey(projectId, params), fetcher, { keepPreviousData: true });
}

export function useItem(id: string | null) {
  return useSWR<WorkItemDetail>(id ? `/api/items/${id}` : null, fetcher);
}
