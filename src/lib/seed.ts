import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Seed the database to a known demo state. Shared by the CLI seed script
 * (prisma/seed.ts) and the test-only reset endpoint so E2E tests can restore a
 * deterministic state quickly and in-process.
 *
 * This board dogfoods Swish's own build: item status, acceptance criteria, and
 * test-plan results reflect what actually shipped and what the Playwright suite
 * actually verifies. Unfinished work (AI spec-gen, the drag flicker bug,
 * responsive polish, auth, realtime) is left honestly open.
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
    { name: "testing", color: "#8b5cf6" },
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

  // ---- Epics ----
  // Board epic: all four children shipped and are tested → Done.
  const epicBoard = await makeItem({
    title: "Configurable board & swimlanes",
    type: "EPIC",
    priority: "HIGH",
    stage: "Done",
    assignee: glenn,
    rank: 100,
    description: "The methodology-agnostic core: stages and swimlanes you can reshape at will.",
  });
  // Spec epic: editor/criteria/test-plan shipped, but AI spec-gen is still a backlog spike → In Progress.
  const epicSpec = await makeItem({
    title: "Spec-first workflow",
    type: "EPIC",
    priority: "URGENT",
    stage: "In Progress",
    assignee: mira,
    rank: 200,
    description: "Structured specs so humans and AI share one precise source of truth.",
  });

  // ---- Board epic children (all delivered + tested) ----
  await makeItem({
    title: "Drag-and-drop cards between stages",
    type: "STORY",
    priority: "HIGH",
    stage: "Done",
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
        { text: "Cross-lane drag reassigns the grouped field (e.g. assignee)", done: true },
        { text: "Intra-column reorder persistence has an automated test", done: false },
        { text: "Keyboard-only drag has an automated test", done: false },
      ],
      tests: [
        { text: "E2E: drag card to another stage updates stage + persists on reload", status: "PASS" },
        { text: "E2E: move reflected in the detail drawer stage select", status: "PASS" },
        { text: "E2E: reorder within a column persists after reload", status: "TODO" },
      ],
    },
  });
  await makeItem({
    title: "Group board by any dimension (swimlanes)",
    type: "STORY",
    priority: "HIGH",
    stage: "Done",
    assignee: glenn,
    estimate: 3,
    epicId: epicBoard.id,
    labels: ["frontend"],
    rank: 120,
    spec: {
      status: "APPROVED",
      problem: "Teams think about work along different axes at different times: who owns it, which epic, how urgent.",
      goals: "Instant toolbar toggle to regroup the board by assignee, epic, priority, or type.",
      nonGoals: "Persisting per-user grouping preferences (v2).",
      approach: "Swimlanes are a pure view concern computed from item fields — no schema change needed.",
      criteria: [
        { text: "Group-by selector offers none/assignee/epic/priority/type", done: true },
        { text: "Switching grouping re-renders swimlanes without a page reload", done: true },
      ],
      tests: [{ text: "E2E: switch group-by to assignee shows per-assignee lanes", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Inline-edit workflow stages",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Done",
    assignee: lena,
    estimate: 3,
    epicId: epicBoard.id,
    labels: ["frontend", "design"],
    rank: 130,
    spec: {
      status: "APPROVED",
      problem: "Workflow shouldn't be admin-gated. Any team member should reshape stages in seconds.",
      goals: "Add, rename, recolor, reorder, and delete stages inline from a settings panel.",
      approach: "Settings page PATCHes stage order/name/color/category/wipLimit; delete reassigns items.",
      criteria: [
        { text: "Add a new stage and it appears on the board", done: true },
        { text: "Rename a stage and cards keep their stage", done: true },
        { text: "Reorder and delete stages (delete reassigns items)", done: true },
      ],
      tests: [
        { text: "E2E: add stage appears as a board column", status: "PASS" },
        { text: "E2E: rename persists; reorder works; delete reassigns items", status: "PASS" },
      ],
    },
  });
  await makeItem({
    title: "WIP limits per stage with visual warning",
    type: "TASK",
    priority: "LOW",
    stage: "Done",
    assignee: dax,
    estimate: 2,
    epicId: epicBoard.id,
    labels: ["frontend"],
    rank: 140,
    description: "Column header shows count/limit and turns red when a stage exceeds its WIP limit.",
  });

  // ---- Spec epic children ----
  await makeItem({
    title: "Structured spec editor",
    type: "STORY",
    priority: "URGENT",
    stage: "Done",
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
      approach: "One Spec row per item; PUT upserts the whole spec. Debounced autosave with a Saved indicator.",
      risks: "Over-structuring scares casual users — keep every section optional.",
      criteria: [
        { text: "Each spec section can be edited and persists", done: true },
        { text: "Spec status can move Draft → In Review → Approved", done: true },
        { text: "Item with a spec shows a spec badge + progress on its card", done: true },
      ],
      tests: [
        { text: "E2E: edit approach section and reload shows saved text", status: "PASS" },
        { text: "E2E: change spec status persists", status: "PASS" },
      ],
    },
  });
  await makeItem({
    title: "Acceptance criteria as checkable list",
    type: "STORY",
    priority: "HIGH",
    stage: "Done",
    assignee: mira,
    estimate: 3,
    epicId: epicSpec.id,
    labels: ["frontend"],
    rank: 220,
    spec: {
      status: "APPROVED",
      problem: "Acceptance criteria buried in prose never get checked off. Make them first-class and trackable.",
      goals: "Add/remove/reorder criteria; toggle done; show completion progress on the card.",
      approach: "AcceptanceCriterion rows linked to spec; card shows n/m done with a check meter.",
      criteria: [
        { text: "Add a criterion via the spec panel", done: true },
        { text: "Toggle a criterion done and progress updates", done: true },
        { text: "Card shows criteria completion count", done: true },
      ],
      tests: [
        { text: "E2E: toggle criterion updates and persists", status: "PASS" },
        { text: "E2E: add criterion appears in the list", status: "PASS" },
      ],
    },
  });
  await makeItem({
    title: "Test plan per item with pass/fail tracking",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Done",
    assignee: dax,
    estimate: 3,
    epicId: epicSpec.id,
    labels: ["backend"],
    rank: 230,
    spec: {
      status: "APPROVED",
      problem: "Specs should carry their own test plan so verification is part of the definition, not an afterthought.",
      goals: "List of test scenarios each with TODO/PASS/FAIL status you can cycle.",
      criteria: [{ text: "Add a test scenario and cycle its status", done: true }],
      tests: [{ text: "E2E: cycle a test-plan item status", status: "PASS" }],
    },
  });
  // Honestly not built yet — a planning-stage spike. Its spec is still a DRAFT.
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
    description: "Explore auto-drafting problem/goals/criteria from a one-line title using Claude.",
    spec: {
      status: "DRAFT",
      problem: "Writing a spec from scratch has activation energy. A good first draft would lower it dramatically.",
      goals: "From a title, propose problem/goals/acceptance-criteria the author edits.",
      approach: "Call the Claude API server-side; stream a structured draft into the spec sections.",
      risks: "Hallucinated criteria; keep the human firmly in the loop as editor.",
      criteria: [{ text: "Draft problem/goals/criteria from a title", done: false }],
    },
  });

  // ---- Standalone delivered work ----
  await makeItem({
    title: "Backlog list view with filtering",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Done",
    assignee: lena,
    estimate: 3,
    labels: ["frontend"],
    rank: 300,
    spec: {
      status: "APPROVED",
      problem: "The board is great for flow; planning needs a dense sortable/filterable table.",
      goals: "Filter by assignee, type, priority, label, and text search; sort; inline stage edits.",
      approach: "Server-side filtering via the items API; client-side sort; inline PATCH from rows.",
      criteria: [
        { text: "Filter backlog by assignee / type / text", done: true },
        { text: "Sort by priority / stage / estimate", done: true },
        { text: "Inline stage change persists", done: true },
      ],
      tests: [
        { text: "E2E: filter by type / text / assignee", status: "PASS" },
        { text: "E2E: sort by priority; inline stage change persists", status: "PASS" },
      ],
    },
  });
  await makeItem({
    title: "REST API for items, stages, specs",
    type: "STORY",
    priority: "HIGH",
    stage: "Done",
    assignee: glenn,
    estimate: 5,
    labels: ["backend"],
    rank: 310,
    spec: {
      status: "APPROVED",
      problem: "The UI needs a clean typed API surface.",
      goals: "CRUD for projects/stages/items/specs with validation.",
      approach: "Next.js route handlers backed by Prisma 7 + SQLite (better-sqlite3 adapter).",
      criteria: [
        { text: "Items endpoint returns board-ready data", done: true },
        { text: "Spec upsert persists sections + criteria", done: true },
      ],
      tests: [{ text: "API: create item returns key; spec upsert persists", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Playwright E2E suite validating every view",
    type: "STORY",
    priority: "HIGH",
    stage: "Done",
    assignee: glenn,
    estimate: 5,
    labels: ["testing", "frontend"],
    rank: 320,
    spec: {
      status: "APPROVED",
      problem: "A full-featured app needs end-to-end proof it actually works, not just unit checks.",
      goals: "Drive the real UI across board, DnD, specs, backlog, settings, specs overview, shortcuts.",
      approach: "Playwright with a data-testid strategy; assertions ride retries to avoid flake.",
      criteria: [
        { text: "Board render, DnD move + persist, swimlane switch covered", done: true },
        { text: "Spec editing, criteria toggle/add, test-plan cycle covered", done: true },
        { text: "Backlog filter/sort/inline-edit and workflow settings covered", done: true },
      ],
      tests: [{ text: "Full suite green (31 tests)", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Deterministic E2E via in-process DB reseed",
    type: "TASK",
    priority: "MEDIUM",
    stage: "Done",
    assignee: glenn,
    estimate: 2,
    labels: ["testing", "backend"],
    rank: 330,
    description: "Per-test reset endpoint + fixture that reseeds before each test, fixing cross-test contamination.",
  });
  await makeItem({
    title: "Production build type/lint clean",
    type: "TASK",
    priority: "MEDIUM",
    stage: "Done",
    assignee: glenn,
    estimate: 1,
    labels: ["tech-debt"],
    rank: 340,
    description: "next build surfaced a duplicate style attribute on BoardCard (dev tolerated it) — fixed.",
  });
  await makeItem({
    title: "Reference screenshots for README/docs",
    type: "TASK",
    priority: "LOW",
    stage: "Done",
    assignee: lena,
    estimate: 1,
    labels: ["design", "testing"],
    rank: 350,
    description: "Playwright captures board, swimlanes, spec editor, backlog, and settings into docs/.",
  });
  await makeItem({
    title: "Seed dataset for demos",
    type: "TASK",
    priority: "LOW",
    stage: "Done",
    assignee: glenn,
    estimate: 1,
    labels: ["infra"],
    rank: 360,
  });

  // ---- In flight / honestly open ----
  await makeItem({
    title: "Dark mode & responsive layout",
    type: "TASK",
    priority: "LOW",
    stage: "In Review",
    assignee: lena,
    estimate: 2,
    labels: ["design", "frontend"],
    rank: 400,
    description: "Dark theme shipped and is the default; responsive breakpoints below tablet still need polish.",
  });
  await makeItem({
    title: "Keyboard shortcuts (c to create, / to search, g-nav)",
    type: "TASK",
    priority: "LOW",
    stage: "Done",
    assignee: dax,
    estimate: 2,
    labels: ["frontend"],
    rank: 410,
    spec: {
      status: "APPROVED",
      problem: "A keyboard-first tool should not require the mouse for common actions.",
      goals: "c = new item, / = focus search, g then b/l/s/w = navigate.",
      criteria: [{ text: "Shortcuts work and are covered by tests", done: true }],
      tests: [{ text: "E2E: c opens modal, / focuses search, g+l navigates", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Cards flicker on drag over empty column",
    type: "BUG",
    priority: "MEDIUM",
    stage: "In Progress",
    assignee: dax,
    estimate: 1,
    labels: ["frontend", "tech-debt"],
    rank: 420,
    description: "Dropping into an empty column briefly shows a ghost card. Not yet fixed or reproduced in a test.",
  });

  // ============================================================
  // ROADMAP — what's next, tracked in the tool itself.
  // Themed epics with stories. A few are already moving into the
  // Spec/Ready pipeline; the rest sit in Backlog, roughly prioritized.
  // ============================================================

  // ---- EPIC: Collaboration & multiplayer ----
  const epicCollab = await makeItem({
    title: "Collaboration & multiplayer",
    type: "EPIC",
    priority: "HIGH",
    stage: "Backlog",
    assignee: null,
    rank: 600,
    description: "Turn Swish from single-player into a real team tool: accounts, live sync, comments, notifications.",
  });
  await makeItem({
    title: "Auth & multi-user workspaces",
    type: "STORY",
    priority: "HIGH",
    stage: "Spec",
    assignee: glenn,
    estimate: 8,
    epicId: epicCollab.id,
    labels: ["backend"],
    rank: 610,
    description: "v1 runs single-workspace with a seeded user. Real auth/SSO and per-tenant data come first.",
    spec: {
      status: "IN_REVIEW",
      problem: "Everything today assumes one shared user. Teams need real identities and isolated workspaces.",
      goals: "Email + OAuth sign-in; workspaces own projects; every query scoped to the current membership.",
      nonGoals: "SCIM provisioning and fine-grained field permissions (later, under RBAC).",
      approach: "Auth.js session; Workspace + Membership models; middleware injects workspace scope into all queries.",
      risks: "Retrofitting scoping onto existing queries — add a Prisma extension so nothing leaks cross-tenant.",
      criteria: [
        { text: "A user can sign in and land in their workspace", done: false },
        { text: "All item/project queries are scoped to the workspace", done: false },
        { text: "Invite a teammate to a workspace", done: false },
      ],
    },
  });
  await makeItem({
    title: "Real-time board sync & presence",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 8,
    epicId: epicCollab.id,
    labels: ["backend", "frontend"],
    rank: 620,
    description: "Live card moves, cursors, and 'who's viewing' — no more manual refresh.",
  });
  await makeItem({
    title: "@mentions & threaded comments",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicCollab.id,
    labels: ["frontend", "backend"],
    rank: 630,
    description: "The activity feed exists; add real comment threads and @mentions that notify.",
  });
  await makeItem({
    title: "Notifications & activity inbox",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicCollab.id,
    labels: ["frontend"],
    rank: 640,
    description: "Per-user inbox of mentions, assignments, and spec-review requests.",
  });
  await makeItem({
    title: "Role-based access control (RBAC)",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicCollab.id,
    labels: ["backend"],
    rank: 650,
    description: "Admin / member / guest roles; who can edit workflow, delete items, approve specs.",
  });

  // ---- EPIC: AI-native workflows ----
  const epicAI = await makeItem({
    title: "AI-native workflows",
    type: "EPIC",
    priority: "HIGH",
    stage: "Backlog",
    assignee: null,
    rank: 700,
    description: "Lean into spec-first: let AI draft, triage, and hand off work — with humans as editors.",
  });
  await makeItem({
    title: "AI-suggested acceptance criteria & test plan",
    type: "STORY",
    priority: "HIGH",
    stage: "Ready",
    assignee: mira,
    estimate: 3,
    epicId: epicAI.id,
    labels: ["backend", "frontend"],
    rank: 710,
    description: "From an item's spec sections, propose criteria and a test plan the author accepts/edits.",
    spec: {
      status: "DRAFT",
      problem: "Even a good spec often ships with thin acceptance criteria. AI can propose a strong first pass.",
      goals: "One click turns problem/goals/approach into suggested criteria + test scenarios to accept or edit.",
      approach: "Claude call with the spec as context; return structured suggestions; insert as unchecked rows.",
      criteria: [
        { text: "Suggest criteria from the spec and let the author accept/edit each", done: false },
        { text: "Suggest a test plan the author can accept", done: false },
      ],
    },
  });
  await makeItem({
    title: "AI triage: type, priority & estimate from a title",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 3,
    epicId: epicAI.id,
    labels: ["backend"],
    rank: 720,
    description: "Draft sensible defaults for new items so the backlog is never a wall of untriaged text.",
  });
  await makeItem({
    title: "Agent hand-off: export a spec as an AI-ready task packet",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicAI.id,
    labels: ["backend"],
    rank: 730,
    description: "One button produces a self-contained brief (spec + criteria + tests + context) for a coding agent.",
  });
  await makeItem({
    title: "Spec → draft PR description & checklist",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 3,
    epicId: epicAI.id,
    labels: ["backend"],
    rank: 740,
    description: "Generate a PR body and a review checklist straight from the approved spec.",
  });

  // ---- EPIC: Planning & insights ----
  const epicPlanning = await makeItem({
    title: "Planning & insights",
    type: "EPIC",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    rank: 800,
    description: "Cadence and visibility without ceremony: cycles, a timeline, and flow metrics.",
  });
  await makeItem({
    title: "Cycles / sprints (time-boxed iterations)",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Spec",
    assignee: lena,
    estimate: 5,
    epicId: epicPlanning.id,
    labels: ["frontend", "backend"],
    rank: 810,
    description: "Optional cycles for teams that want cadence — without forcing Scrum on everyone.",
    spec: {
      status: "DRAFT",
      problem: "Some teams want time-boxed iterations; Swish must support them without mandating a methodology.",
      goals: "Create a cycle with dates; assign items; a cycle view shows scope, progress, and carryover.",
      nonGoals: "Story-point ceremonies, mandatory planning poker.",
      approach: "Cycle model with date range; items get an optional cycleId; a filtered board/backlog per cycle.",
      criteria: [
        { text: "Create a cycle and assign items to it", done: false },
        { text: "Cycle view shows progress and carryover", done: false },
      ],
    },
  });
  await makeItem({
    title: "Roadmap view (epics, progress & stage flow)",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Done",
    assignee: glenn,
    estimate: 5,
    epicId: epicPlanning.id,
    labels: ["frontend"],
    rank: 820,
    description: "A first-class Roadmap page: epics with completion %, a stage-distribution bar, and grouped stories.",
    spec: {
      status: "APPROVED",
      problem: "You asked to see what's next. The board is per-item; leadership needs an epic-level view of progress.",
      goals: "Epics ordered by priority with % done, a per-stage distribution bar, and clickable child stories.",
      nonGoals: "A date/time axis with dependencies — tracked separately as a timeline view.",
      approach: "New /roadmap page; group items by epic; compute done from stage category; open the drawer on click.",
      criteria: [
        { text: "Each epic shows completion % and a stage-distribution bar", done: true },
        { text: "Child stories are grouped under their epic and open the drawer", done: true },
        { text: "Standalone (epic-less) work has its own section", done: true },
      ],
      tests: [{ text: "E2E: renders a section per epic; 100% for a delivered epic; story opens drawer", status: "PASS" }],
    },
  });
  await makeItem({
    title: "Timeline view with dates & dependencies",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicPlanning.id,
    labels: ["frontend"],
    rank: 825,
    description: "A true time-axis Gantt: schedule epics/stories on a calendar with dependency links.",
  });
  await makeItem({
    title: "Cycle analytics: burndown & velocity",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 3,
    epicId: epicPlanning.id,
    labels: ["frontend"],
    rank: 830,
    description: "Charts for completed vs remaining and rolling velocity across cycles.",
  });
  await makeItem({
    title: "Flow metrics: cycle time, WIP aging & throughput",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicPlanning.id,
    labels: ["frontend", "backend"],
    rank: 840,
    description: "Kanban-style flow health so teams can improve without guessing.",
  });
  await makeItem({
    title: "Saved views & filters",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 3,
    epicId: epicPlanning.id,
    labels: ["frontend"],
    rank: 850,
    description: "Name and pin common filter+grouping combinations (e.g. 'My urgent bugs').",
  });

  // ---- EPIC: Integrations ----
  const epicIntegrations = await makeItem({
    title: "Integrations",
    type: "EPIC",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    rank: 900,
    description: "Meet engineers where they already are: GitHub, Slack, the terminal, and webhooks.",
  });
  await makeItem({
    title: "GitHub two-way sync (issues / PRs ↔ items)",
    type: "STORY",
    priority: "HIGH",
    stage: "Backlog",
    assignee: null,
    estimate: 8,
    epicId: epicIntegrations.id,
    labels: ["backend"],
    rank: 910,
    description: "Link items to PRs; move to Done when a PR merges; mirror status back to GitHub.",
  });
  await makeItem({
    title: "Slack notifications & slash commands",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicIntegrations.id,
    labels: ["backend"],
    rank: 920,
    description: "Notify channels on stage changes and create items from Slack with /swish.",
  });
  await makeItem({
    title: "API tokens & webhooks",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 3,
    epicId: epicIntegrations.id,
    labels: ["backend"],
    rank: 930,
    description: "Personal access tokens and outbound webhooks so teams can automate their own glue.",
  });
  await makeItem({
    title: "Swish CLI for terminal-first teams",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicIntegrations.id,
    labels: ["backend"],
    rank: 940,
    description: "Create/move/inspect items and pull a spec as an agent brief without leaving the terminal.",
  });

  // ---- EPIC: Polish & scale ----
  const epicPolish = await makeItem({
    title: "Polish & scale",
    type: "EPIC",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    rank: 1000,
    description: "The details that make it feel fast and complete: mobile, a11y, bulk edits, Cmd-K, custom fields.",
  });
  await makeItem({
    title: "Command palette (Cmd-K)",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Ready",
    assignee: dax,
    estimate: 3,
    epicId: epicPolish.id,
    labels: ["frontend"],
    rank: 1010,
    description: "Jump to any item, run any action, switch views — all from the keyboard.",
  });
  await makeItem({
    title: "Bulk edit & multi-select",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicPolish.id,
    labels: ["frontend"],
    rank: 1020,
    description: "Select many cards/rows and reassign, restage, or relabel in one move.",
  });
  await makeItem({
    title: "Full keyboard navigation & a11y pass",
    type: "STORY",
    priority: "MEDIUM",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicPolish.id,
    labels: ["frontend", "tech-debt"],
    rank: 1030,
    description: "Roving focus on the board, ARIA roles, keyboard drag — WCAG-minded throughout.",
  });
  await makeItem({
    title: "Custom fields per project",
    type: "STORY",
    priority: "LOW",
    stage: "Backlog",
    assignee: null,
    estimate: 5,
    epicId: epicPolish.id,
    labels: ["backend", "frontend"],
    rank: 1040,
    description: "Let teams add their own typed fields (select, number, URL) and group/filter by them.",
  });

  await prisma.project.update({ where: { id: project.id }, data: { seq } });

  const itemCount = await prisma.workItem.count();
  return { users: users.length, stages: stages.length, items: itemCount };
}
