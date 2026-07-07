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
  blockedBy: {
    select: {
      id: true,
      blocker: { select: { id: true, key: true, stage: { select: { category: true } } } },
    },
  },
} as const;

const depItemSelect = {
  select: { id: true, key: true, title: true, stage: { select: { name: true, category: true } } },
} as const;

export const itemDetailInclude = {
  ...itemInclude,
  children: { select: { id: true, key: true, title: true, stageId: true } },
  fieldValues: { select: { id: true, fieldId: true, value: true } },
  blocks: { select: { id: true, blocked: depItemSelect } },
  blockedBy: { select: { id: true, blocker: depItemSelect } },
  activity: {
    orderBy: { createdAt: "asc" },
    include: { user: true },
  },
} as const;
