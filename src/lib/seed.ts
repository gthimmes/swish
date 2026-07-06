import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Seed the database to a known demo state. Shared by the CLI seed script
 * (prisma/seed.ts) and the test-only reset endpoint so E2E tests can restore a
 * deterministic state quickly and in-process.
 */
export async function seedDatabase(prisma: PrismaClient) {
  // Clean slate
  await prisma.activity.deleteMany();
  await prisma.acceptanceCriterion.deleteMany();
  await prisma.testPlanItem.deleteMany();
  await prisma.spec.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.label.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const [glenn, mira, dax, lena] = await Promise.all([
    prisma.user.create({ data: { name: "Glenn Thimmes", initials: "GT", color: "#6366f1" } }),
    prisma.user.create({ data: { name: "Mira Patel", initials: "MP", color: "#ec4899" } }),
    prisma.user.create({ data: { name: "Dax Okonkwo", initials: "DO", color: "#14b8a6" } }),
    prisma.user.create({ data: { name: "Lena Nyström", initials: "LN", color: "#f59e0b" } }),
  ]);
  const users = [glenn, mira, dax, lena];

  // Project (Swish dogfooding itself)
  const project = await prisma.project.create({
    data: {
      key: "SWISH",
      name: "Swish Platform",
      description: "Building the spec-first work tracker.",
      groupBy: "none",
    },
  });

  // Configurable workflow stages
  const stageDefs = [
    { name: "Backlog", color: "#64748b", category: "BACKLOG" },
    { name: "Spec", color: "#a855f7", category: "IN_PROGRESS" },
    { name: "Ready", color: "#0ea5e9", category: "IN_PROGRESS" },
    { name: "In Progress", color: "#3b82f6", category: "IN_PROGRESS", wipLimit: 4 },
    { name: "In Review", color: "#eab308", category: "IN_PROGRESS" },
    { name: "Done", color: "#22c55e", category: "DONE" },
  ];
  const stages = [];
  for (let i = 0; i < stageDefs.length; i++) {
    const s = stageDefs[i];
    stages.push(await prisma.stage.create({ data: { ...s, order: i, projectId: project.id } }));
  }
  const byStage = Object.fromEntries(stages.map((s) => [s.name, s]));

  // Labels
  const labelDefs = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#22c55e" },
    { name: "design", color: "#ec4899" },
    { name: "infra", color: "#f59e0b" },
    { name: "tech-debt", color: "#94a3b8" },
  ];
  const labels: Record<string, { id: string }> = {};
  for (const l of labelDefs) {
    labels[l.name] = await prisma.label.create({ data: { ...l, projectId: project.id } });
  }

  let seq = 0;
  const nextKey = () => `SWISH-${++seq}`;

  async function makeItem(opts: {
    title: string;
    type?: string;
    priority?: string;
    stage: string;
    assignee?: { id: string } | null;
    estimate?: number;
    epicId?: string;
    labels?: string[];
    rank: number;
    description?: string;
    spec?: {
      status?: string;
      problem?: string;
      goals?: string;
      nonGoals?: string;
      approach?: string;
      risks?: string;
      criteria?: { text: string; done?: boolean }[];
      tests?: { text: string; status?: string }[];
    };
  }) {
    const item = await prisma.workItem.create({
      data: {
        key: nextKey(),
        title: opts.title,
        type: opts.type ?? "STORY",
        priority: opts.priority ?? "MEDIUM",
        estimate: opts.estimate,
        rank: opts.rank,
        description: opts.description,
        projectId: project.id,
        stageId: byStage[opts.stage].id,
        assigneeId: opts.assignee?.id ?? null,
        epicId: opts.epicId,
        labels: opts.labels ? { connect: opts.labels.map((n) => ({ id: labels[n].id })) } : undefined,
      },
    });
    if (opts.spec) {
      const spec = await prisma.spec.create({
        data: {
          workItemId: item.id,
          status: opts.spec.status ?? "DRAFT",
          problem: opts.spec.problem ?? "",
          goals: opts.spec.goals ?? "",
          nonGoals: opts.spec.nonGoals ?? "",
          approach: opts.spec.approach ?? "",
          risks: opts.spec.risks ?? "",
        },
      });
      if (opts.spec.criteria) {
        for (let i = 0; i < opts.spec.criteria.length; i++) {
          const c = opts.spec.criteria[i];
          await prisma.acceptanceCriterion.create({
            data: { specId: spec.id, text: c.text, done: c.done ?? false, order: i },
          });
        }
      }
      if (opts.spec.tests) {
        for (let i = 0; i < opts.spec.tests.length; i++) {
          const t = opts.spec.tests[i];
          await prisma.testPlanItem.create({
            data: { specId: spec.id, text: t.text, status: t.status ?? "TODO", order: i },
          });
        }
      }
    }
    await prisma.activity.create({
      data: { workItemId: item.id, kind: "event", body: `created ${item.key}`, userId: glenn.id },
    });
    return item;
  }

  // Epics
  const epicBoard = await makeItem({
    title: "Configurable board & swimlanes",
    type: "EPIC",
    priority: "HIGH",
    stage: "In Progress",
    assignee: glenn,
    rank: 100,
    description: "The methodology-agnostic core: stages and swimlanes you can reshape at will.",
  });
  const epicSpec = await makeItem({
    title: "Spec-first workflow",
    type: "EPIC",
    priority: "URGENT",
    stage: "In Progress",
    assignee: mira,
    rank: 200,
    description: "Structured specs so humans and AI share one precise source of truth.",
  });

  await makeItem({
    title: "Drag-and-drop cards between stages",
    type: "STORY",
    priority: "HIGH",
    stage: "In Review",
    assignee: dax,
    estimate: 5,
    epicId: epicBoard.id,
    labels: ["frontend"],
    rank: 110,
    spec: {
      status: "APPROVED",
      problem: "Moving work through the workflow must feel instant and physical, not a dropdown edit.",
      goals: "Smooth pointer + keyboard drag; optimistic move; rank-based ordering within a column.",
      nonGoals: "Multi-select drag; cross-project moves.",
      approach: "Use @dnd-kit with a sortable context per column. On drop, PATCH stageId + rank.",
      risks: "Rank collisions on rapid reorders — mitigate with float midpoint ranking.",
      criteria: [
        { text: "Given a card, when I drag it to another column, then its stage updates and persists", done: true },
        { text: "Given a column, when I drop a card between two cards, then its order is preserved on reload", done: true },
        { text: "Keyboard users can move a card with arrow keys", done: false },
      ],
      tests: [
        { text: "E2E: drag card from In Progress to Done updates stage", status: "PASS" },
        { text: "E2E: reorder within column persists after reload", status: "TODO" },
      ],
    },
  });
  await makeItem({
    title: "Group board by any dimension (swimlanes)",
    type: "STORY",
    priority: "HIGH",
    stage: "In Progress",
    assignee: glenn,
    estimate: 3,
    epicId: epicBoard.id,
    labels: ["frontend"],
    rank: 120,
    spec: {
      status: "IN_REVIEW",
      problem: "Teams think about work along different axes at different times: who owns it, which epic, how urgent.",
      goals: "Instant toolbar toggle to regroup the board by assignee, epic, priority, or type.",
      nonGoals: "Persisting per-user grouping preferences (v2).",
      approach: "Swimlanes are a pure view concern computed from item fields — no schema change needed.",
      criteria: [
        { text: "Group-by selector offers none/assignee/epic/priority/type", done: true },
        { text: "Switching grouping re-renders swimlanes without a page reload", done: false },
      ],
      tests: [{ text: "E2E: switch group-by to assignee shows per-assignee lanes", status: "TODO" }],
    },
  });
  await makeItem({
    title: "Inline-edit workflow stages",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Ready",
    assignee: lena,
    estimate: 3,
    epicId: epicBoard.id,
    labels: ["frontend", "design"],
    rank: 130,
    spec: {
      status: "DRAFT",
      problem: "Workflow shouldn't be admin-gated. Any team member should reshape stages in seconds.",
      goals: "Add, rename, recolor, reorder, and delete stages inline from a settings panel.",
      criteria: [
        { text: "Add a new stage and it appears on the board", done: false },
        { text: "Rename a stage and cards keep their stage", done: false },
      ],
    },
  });
  await makeItem({
    title: "WIP limits per stage with visual warning",
    type: "TASK",
    priority: "LOW",
    stage: "Backlog",
    assignee: dax,
    estimate: 2,
    epicId: epicBoard.id,
    labels: ["frontend"],
    rank: 140,
  });

  await makeItem({
    title: "Structured spec editor",
    type: "STORY",
    priority: "URGENT",
    stage: "In Progress",
    assignee: mira,
    estimate: 5,
    epicId: epicSpec.id,
    labels: ["frontend", "backend"],
    rank: 210,
    spec: {
      status: "APPROVED",
      problem: "A freeform description blob is unreviewable and useless to an AI agent. We need structure.",
      goals: "Sections for problem, goals, non-goals, approach, risks. Editable, autosaving, status-tracked.",
      nonGoals: "Rich text / markdown WYSIWYG (plain multiline for v1).",
      approach: "One Spec row per item; PUT upserts the whole spec. Sections are plain text fields.",
      risks: "Over-structuring scares casual users — keep every section optional.",
      criteria: [
        { text: "Each spec section can be edited and persists", done: true },
        { text: "Spec status can move Draft → In Review → Approved", done: true },
        { text: "Item with a spec shows a spec badge on its card", done: false },
      ],
      tests: [
        { text: "E2E: edit approach section and reload shows saved text", status: "PASS" },
        { text: "E2E: change spec status to Approved", status: "PASS" },
      ],
    },
  });
  await makeItem({
    title: "Acceptance criteria as checkable list",
    type: "STORY",
    priority: "HIGH",
    stage: "In Review",
    assignee: mira,
    estimate: 3,
    epicId: epicSpec.id,
    labels: ["frontend"],
    rank: 220,
    spec: {
      status: "IN_REVIEW",
      problem: "Acceptance criteria buried in prose never get checked off. Make them first-class and trackable.",
      goals: "Add/remove/reorder criteria; toggle done; show completion progress on the card.",
      approach: "AcceptanceCriterion rows linked to spec; card shows n/m done.",
      criteria: [
        { text: "Add a criterion via the spec panel", done: true },
        { text: "Toggle a criterion done and progress updates", done: true },
        { text: "Card shows criteria completion count", done: false },
      ],
      tests: [{ text: "E2E: toggle criterion updates progress", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Test plan per item with pass/fail tracking",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Spec",
    assignee: dax,
    estimate: 3,
    epicId: epicSpec.id,
    labels: ["backend"],
    rank: 230,
    spec: {
      status: "DRAFT",
      problem: "Specs should carry their own test plan so verification is part of the definition, not an afterthought.",
      goals: "List of test scenarios each with TODO/PASS/FAIL status.",
      criteria: [{ text: "Add test scenario and set its status", done: false }],
    },
  });
  await makeItem({
    title: "Generate spec scaffold from a title with AI",
    type: "SPIKE",
    priority: "LOW",
    stage: "Backlog",
    assignee: mira,
    estimate: 2,
    epicId: epicSpec.id,
    labels: ["backend"],
    rank: 240,
    description: "Explore auto-drafting problem/goals/criteria from a one-line title.",
  });

  await makeItem({
    title: "Backlog list view with filtering",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Ready",
    assignee: lena,
    estimate: 3,
    labels: ["frontend"],
    rank: 300,
    spec: {
      status: "DRAFT",
      problem: "The board is great for flow; planning needs a dense sortable/filterable table.",
      goals: "Filter by assignee, type, priority, label, and text search.",
      criteria: [{ text: "Filter backlog by assignee", done: false }],
    },
  });
  await makeItem({
    title: "Cards flicker on drag over empty column",
    type: "BUG",
    priority: "HIGH",
    stage: "In Progress",
    assignee: dax,
    estimate: 1,
    labels: ["frontend", "tech-debt"],
    rank: 310,
    description: "Dropping into an empty column briefly shows a ghost card.",
  });
  await makeItem({
    title: "Seed dataset for demos",
    type: "TASK",
    priority: "LOW",
    stage: "Done",
    assignee: glenn,
    estimate: 1,
    labels: ["infra"],
    rank: 320,
  });
  await makeItem({
    title: "REST API for items, stages, specs",
    type: "STORY",
    priority: "HIGH",
    stage: "Done",
    assignee: glenn,
    estimate: 5,
    labels: ["backend"],
    rank: 330,
    spec: {
      status: "APPROVED",
      problem: "The UI needs a clean typed API surface.",
      goals: "CRUD for projects/stages/items/specs with validation.",
      approach: "Next.js route handlers backed by Prisma.",
      criteria: [
        { text: "Items endpoint returns board-ready data", done: true },
        { text: "Spec upsert persists sections + criteria", done: true },
      ],
      tests: [{ text: "API: create item returns key", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Dark mode & responsive layout",
    type: "TASK",
    priority: "LOW",
    stage: "Backlog",
    assignee: lena,
    estimate: 2,
    labels: ["design", "frontend"],
    rank: 340,
  });
  await makeItem({
    title: "Keyboard shortcuts (c to create, / to search)",
    type: "TASK",
    priority: "LOW",
    stage: "Backlog",
    assignee: dax,
    estimate: 2,
    labels: ["frontend"],
    rank: 350,
  });

  await prisma.project.update({ where: { id: project.id }, data: { seq } });

  const itemCount = await prisma.workItem.count();
  return { users: users.length, stages: stages.length, items: itemCount };
}
