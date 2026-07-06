// Enum-like constants (SQLite has no native enums). Single source of truth for
// the UI and validation.

export const ITEM_TYPES = ["STORY", "TASK", "BUG", "SPIKE", "EPIC"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STAGE_CATEGORIES = ["BACKLOG", "IN_PROGRESS", "DONE"] as const;
export type StageCategory = (typeof STAGE_CATEGORIES)[number];

export const SPEC_STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED"] as const;
export type SpecStatus = (typeof SPEC_STATUSES)[number];

export const TEST_STATUSES = ["TODO", "PASS", "FAIL"] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const GROUP_BY = ["none", "assignee", "epic", "priority", "type"] as const;
export type GroupBy = (typeof GROUP_BY)[number];

export const TYPE_META: Record<ItemType, { label: string; icon: string; color: string }> = {
  STORY: { label: "Story", icon: "◆", color: "#22c55e" },
  TASK: { label: "Task", icon: "✔", color: "#3b82f6" },
  BUG: { label: "Bug", icon: "●", color: "#ef4444" },
  SPIKE: { label: "Spike", icon: "⚡", color: "#a855f7" },
  EPIC: { label: "Epic", icon: "❖", color: "#f59e0b" },
};

export const PRIORITY_META: Record<Priority, { label: string; icon: string; color: string; weight: number }> = {
  URGENT: { label: "Urgent", icon: "⏫", color: "#ef4444", weight: 0 },
  HIGH: { label: "High", icon: "▲", color: "#f97316", weight: 1 },
  MEDIUM: { label: "Medium", icon: "■", color: "#eab308", weight: 2 },
  LOW: { label: "Low", icon: "▽", color: "#64748b", weight: 3 },
};

export const SPEC_STATUS_META: Record<SpecStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "#64748b" },
  IN_REVIEW: { label: "In Review", color: "#eab308" },
  APPROVED: { label: "Approved", color: "#22c55e" },
};

export const CATEGORY_META: Record<StageCategory, { label: string }> = {
  BACKLOG: { label: "Backlog" },
  IN_PROGRESS: { label: "In Progress" },
  DONE: { label: "Done" },
};
