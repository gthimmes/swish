// Shared Prisma include shapes so the API returns board-ready payloads.

export const itemInclude = {
  assignee: true,
  stage: true,
  labels: true,
  epic: { select: { id: true, key: true, title: true } },
  spec: {
    include: {
      criteria: { orderBy: { order: "asc" } },
      tests: { orderBy: { order: "asc" } },
    },
  },
} as const;

export const itemListInclude = {
  assignee: true,
  labels: true,
  epic: { select: { id: true, key: true, title: true } },
  spec: {
    select: {
      id: true,
      status: true,
      criteria: { select: { done: true } },
      tests: { select: { status: true } },
    },
  },
} as const;

export const itemDetailInclude = {
  ...itemInclude,
  children: { select: { id: true, key: true, title: true, stageId: true } },
  activity: {
    orderBy: { createdAt: "desc" },
    include: { user: true },
  },
} as const;
