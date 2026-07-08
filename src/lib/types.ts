import type { GroupBy, ItemType, Priority, SpecStatus, StageCategory, TestStatus } from "./enums";

export type User = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type Stage = {
  id: string;
  name: string;
  color: string;
  category: StageCategory;
  order: number;
  wipLimit: number | null;
  projectId: string;
};

export type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  groupBy: GroupBy;
  seq: number;
  stages: Stage[];
  labels: Label[];
};

export type ProjectSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  groupBy: GroupBy;
  _count: { items: number };
};

export type EpicRef = { id: string; key: string; title: string };

export type CustomField = {
  id: string;
  projectId: string;
  name: string;
  type: string; // TEXT | NUMBER | SELECT | URL
  options: string; // JSON array
  order: number;
};

export type Cycle = {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type Criterion = { id: string; text: string; done: boolean; order: number };
export type TestItem = { id: string; text: string; status: TestStatus; order: number };

export type Spec = {
  id: string;
  status: SpecStatus;
  problem: string;
  goals: string;
  nonGoals: string;
  approach: string;
  risks: string;
  criteria: Criterion[];
  tests: TestItem[];
};

export type SpecSummary = {
  id: string;
  status: SpecStatus;
  criteria: { done: boolean }[];
  tests: { status: TestStatus }[];
};

export type WorkItem = {
  id: string;
  key: string;
  title: string;
  type: ItemType;
  priority: Priority;
  estimate: number | null;
  rank: number;
  description: string | null;
  projectId: string;
  stageId: string;
  assigneeId: string | null;
  epicId: string | null;
  cycleId: string | null;
  startDate: string | null;
  dueDate: string | null;
  assignee: User | null;
  labels: Label[];
  epic: EpicRef | null;
  spec: SpecSummary | null;
  blockedBy: { id: string; blocker: { id: string; key: string; stage: { category: string } } }[];
  fieldValues: { id: string; fieldId: string; value: string }[];
  createdAt: string;
  updatedAt: string;
};

export type DepRef = {
  id: string; // the related item's id
  key: string;
  title: string;
  stage: { name: string; category: string };
};

export type Activity = {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  user: User | null;
};

export type WorkItemDetail = Omit<WorkItem, "spec" | "blockedBy"> & {
  stage: Stage;
  spec: Spec | null;
  children: { id: string; key: string; title: string; stageId: string }[];
  blocks: { id: string; blocked: DepRef }[];
  blockedBy: { id: string; blocker: DepRef }[];
  fieldValues: { id: string; fieldId: string; value: string }[];
  activity: Activity[];
};
