import type { HelpContent } from "help-navigator";

// The in-app help corpus: categories + markdown articles, rendered by the
// help-navigator widget mounted in the (app) layout.
export const helpContent: HelpContent = {
  categories: [
    {
      id: "getting-started",
      title: "Getting started",
      icon: "🚀",
      description: "The Swish tour, navigation, keyboard shortcuts, and your inbox.",
    },
    {
      id: "board",
      title: "Board & views",
      icon: "📋",
      description: "Stage columns, swimlanes, drag-and-drop, and saved views.",
    },
    {
      id: "specs",
      title: "Specs",
      icon: "📐",
      description: "Structured specs, acceptance criteria, test plans, and agent briefs.",
    },
    {
      id: "planning",
      title: "Planning",
      icon: "🗓️",
      description: "Cycles, the timeline, the roadmap, and task dependencies.",
    },
    {
      id: "items",
      title: "Work items",
      icon: "🧱",
      description: "The item drawer, custom fields, the backlog, bulk edit, and comments.",
    },
    {
      id: "workflow-admin",
      title: "Workflow & insights",
      icon: "⚙️",
      description: "Configuring stages and WIP limits; the insights dashboard and flow metrics.",
    },
  ],
  articles: [
    // ---------- Getting started ----------
    {
      id: "swish-tour",
      title: "Swish in two minutes",
      category: "getting-started",
      featured: true,
      tags: ["overview", "tour", "basics", "spec-first"],
      body: `Swish is **spec-first work tracking**: a configurable workflow, swimlanes you can toggle along any dimension, and specs that are structured and reviewable rather than a freeform text blob.

## The core loop

1. **Capture** — create a work item (\`c\` from anywhere, or **+ New item**)
2. **Spec** — attach a structured spec: Problem, Goals, Non-Goals, Approach, Risks, plus acceptance criteria and a test plan
3. **Flow** — drag the card through your stages on the **Board**
4. **Ship** — hand the item to an engineer or AI agent as a one-click **agent brief**, and draft the PR description from the spec

## Where things live

The left sidebar is the map: **Inbox**, **Board**, **Backlog**, **Roadmap**, **Cycles**, **Timeline**, **Insights**, **Specs**, and **Workflow** (stage settings). The project switcher at the top scopes everything to one project.

> Press **F1** anytime to open this help panel, or **⌘K** for the command palette.`,
      related: ["navigation-shortcuts", "board-basics", "specs-structured"],
    },
    {
      id: "navigation-shortcuts",
      title: "Keyboard shortcuts and the command palette",
      category: "getting-started",
      featured: true,
      tags: ["keyboard", "shortcuts", "command palette", "cmd-k", "hotkeys"],
      body: `Swish is built to be driven from the keyboard.

## Global shortcuts

- \`c\` — create a new work item
- \`/\` — focus the current view's search/filter box
- \`g\` then \`b\` / \`l\` / \`s\` / \`w\` — go to **Board**, **Backlog**, **Specs**, or **Workflow**
- **F1** — toggle this help panel

## Command palette (⌘K)

**⌘K** (or **Ctrl+K**) opens the command palette: fuzzy-search work items by key or title, jump to any view, and run actions — all without touching the mouse. Hit Enter on an item result to open it in the drawer.

Shortcuts stay out of your way while you type — they only fire when no input is focused.`,
      related: ["swish-tour", "item-drawer"],
    },
    {
      id: "inbox-help",
      title: "Your inbox: assignments and @mentions",
      category: "getting-started",
      tags: ["inbox", "mentions", "assigned", "badge", "notifications"],
      body: `**Inbox** is the per-user view of what needs *you*:

- **Assigned to you** — open items where you're the assignee
- **Mentions** — comments that @mention you, with a jump straight to the thread

The sidebar shows a **count badge** on Inbox so you can see at a glance when something new lands. Items leave the assigned list when they close; mentions clear as the conversation moves on.

Treat the inbox as your starting point each morning: it's the intersection of the project's state and your name.`,
      related: ["comments-mentions", "item-drawer"],
    },

    // ---------- Board & views ----------
    {
      id: "board-basics",
      title: "The board: stages, cards, and drag-and-drop",
      category: "board",
      featured: true,
      tags: ["board", "columns", "stages", "drag", "drop", "kanban", "cards"],
      body: `The **Board** shows your workflow as columns — one per stage, in the order you configured them (the seeded default: Backlog → Spec → Ready → In Progress → In Review → Done).

## Moving work

**Drag a card** to another column to restage it, or reorder within a column to reprioritize. Drops are optimistic — the UI updates instantly and persists in the background. Drag-and-drop is keyboard-accessible too.

## Cards

Each card carries the item's key (like \`SWISH-12\`), title, type, priority, assignee, and — when relevant — a **Blocked** chip from its dependencies. Click a card to open the full item drawer.

Columns are *your* workflow, not ours: add, rename, recolor, and reorder them under **Workflow** in the sidebar — no admin gate.`,
      related: ["swimlanes", "workflow-stages", "item-drawer"],
    },
    {
      id: "swimlanes",
      title: "Swimlanes: group the board by any dimension",
      category: "board",
      featured: true,
      tags: ["swimlanes", "group by", "lanes", "assignee", "epic", "priority"],
      body: `Swimlanes are a **first-class toggle**, not a stored configuration. The **Group by** control on the board slices it instantly by:

- **Assignee** — who's carrying what
- **Epic** — progress by initiative
- **Priority** — is anyone actually working the urgent lane?
- **Type** — features vs bugs vs chores

## Drag across lanes

Dragging a card **across lanes reassigns that dimension** — drop a card in Dana's lane and Dana is now the assignee; drop it in another epic's lane and it moves epics. Drag within a lane to restage as usual.

Lanes are computed at render time from item fields, which is why switching is instant and never migrates data.`,
      related: ["board-basics", "saved-views"],
    },
    {
      id: "saved-views",
      title: "Saved views",
      category: "board",
      tags: ["saved views", "filters", "presets", "grouping"],
      body: `A **saved view** captures a grouping + filter combination under a name you choose — "My plate" (group by assignee, filtered to you), "Bugs this cycle", "Unspecced work".

## Using them

Set up the board the way you want — group-by, filters, search — then **save the view**. Applying a saved view is one click, and deleting one never touches the underlying items.

Saved views are how a methodology-agnostic board stays personal: the same project can look like a kanban system to one person and a sprint board to another.`,
      related: ["swimlanes", "backlog-bulk"],
    },

    // ---------- Specs ----------
    {
      id: "specs-structured",
      title: "Structured specs: Problem to Risks",
      category: "specs",
      featured: true,
      tags: ["spec", "structured", "problem", "goals", "approach", "review", "approved"],
      body: `Every work item can carry a **structured spec** — not a text blob, but named sections:

- **Problem & Context** — why this work exists
- **Goals** / **Non-Goals** — what done means, and what's explicitly out
- **Technical Approach** — how it will be built
- **Risks & Open Questions** — what could go wrong

## Review flow

A spec has a status that flows **Draft → In Review → Approved**. Draft while you think, In Review when it's ready for eyes, Approved when the team commits. The specs overview page filters by status, so "what's waiting on review" is one click.

Structure is the point: a reviewer can see a missing Non-Goals section at a glance, and an AI agent can consume the spec without guessing at prose.`,
      related: ["criteria-tests", "agent-brief", "specs-overview"],
    },
    {
      id: "criteria-tests",
      title: "Acceptance criteria and the test plan",
      category: "specs",
      tags: ["acceptance criteria", "checklist", "test plan", "pass", "fail"],
      body: `Below the spec sections live two working lists:

## Acceptance criteria

A **checkable list** of concrete outcomes. Add criteria while speccing; check them off as the implementation lands. The specs overview shows criteria progress per item, so "80% done" means something.

## Test plan

Each test-plan entry tracks a status you can cycle through — pending, **pass**, or **fail** — turning "did we verify it?" from a memory into a record.

Both lists ride along into the **agent brief** and the **draft PR description**, checked state included — the spec you wrote becomes the checklist the reviewer sees.`,
      related: ["specs-structured", "agent-brief"],
    },
    {
      id: "agent-brief",
      title: "Agent briefs and draft PR descriptions",
      category: "specs",
      featured: true,
      tags: ["agent", "brief", "ai", "hand-off", "pull request", "pr", "copy"],
      body: `Swish's spec-first promise made concrete: from any item's drawer you can generate two copyable markdown packets.

## Agent brief

**Agent brief** builds a self-contained task brief — key, title, type, priority, stage, assignee, epic, estimate, schedule, labels, the full spec sections, acceptance criteria (with checked state), and the test plan. Everything an engineer *or an AI agent* needs to execute, in one copy-paste. Items without a spec still get a brief, with a nudge to add one.

## Draft PR description

**Draft PR** turns the same spec into a pull-request body: a suggested title, a summary, and the acceptance criteria and test plan as GitHub-flavored checklists, ending with \`Closes SWISH-n\` so the PR links back.

Both have a one-click **Copy** button that confirms with "Copied!".`,
      related: ["specs-structured", "criteria-tests"],
    },
    {
      id: "specs-overview",
      title: "The specs overview page",
      category: "specs",
      tags: ["specs page", "coverage", "status filter", "progress"],
      body: `**Specs** in the sidebar lists every spec in the project at a glance — item key and title, spec **status** (Draft / In Review / Approved), and progress bars for acceptance criteria and test-plan items.

Filter by status to run a spec-review session ("everything In Review"), or scan for gaps: items in flight with no spec show up in the **spec coverage** donut on Insights.

Use it as the editorial desk for your specs — the board tells you where work *is*, this page tells you how well-defined it is.`,
      related: ["specs-structured", "insights-flow"],
    },

    // ---------- Planning ----------
    {
      id: "cycles-help",
      title: "Cycles (sprints, if you want them)",
      category: "planning",
      featured: true,
      tags: ["cycles", "sprints", "iterations", "timebox", "active", "upcoming"],
      body: `**Cycles** are optional time-boxed iterations — call them sprints if that's your methodology, or ignore them entirely. Swish stays methodology-agnostic either way.

## How they work

Each cycle has a name, start and end dates, and a computed status: **Upcoming**, **Active**, or **Completed**. The Cycles page shows per-cycle **progress** — how much of the assigned work is done.

## Assigning work

Assign an item to a cycle from its **detail drawer**. Items keep all their other behavior — they still live on the board, the timeline, and the backlog; the cycle is just one more dimension.

Teams that don't sprint simply never create a cycle; nothing else in Swish assumes one exists.`,
      related: ["timeline-help", "item-drawer"],
    },
    {
      id: "timeline-help",
      title: "The timeline: a mini-Gantt",
      category: "planning",
      tags: ["timeline", "gantt", "schedule", "dates", "overdue", "today"],
      body: `**Timeline** lays every item with start/due dates onto a month axis, grouped by epic — a mini-Gantt for the project.

## Reading it

- Bars span an item's **start → due** range
- A vertical **today line** anchors the present
- **Overdue** items are flagged
- **Blocked** items get a distinct outline from their dependencies

Items without dates don't appear — the timeline is for scheduled work. Set start and due dates in the item drawer to place a bar.

The timeline answers "when", the board answers "what state" — same items, orthogonal lenses.`,
      related: ["cycles-help", "dependencies-help", "roadmap-help"],
    },
    {
      id: "roadmap-help",
      title: "The roadmap: epics and progress",
      category: "planning",
      tags: ["roadmap", "epics", "progress", "completion", "stories"],
      body: `**Roadmap** is the epic-level view: every epic ordered by priority, each with

- a **completion percentage** across its child items,
- a **per-stage distribution bar** — how the epic's work spreads across your workflow, and
- its grouped stories, expandable and clickable through to the drawer.

An epic in Swish is a work item of type *Epic* that other items point to as their parent — so the roadmap stays in lockstep with the board with zero extra bookkeeping.

Use it for stakeholder conversations: "how far along is Search?" is a glance, not a query.`,
      related: ["timeline-help", "board-basics"],
    },
    {
      id: "dependencies-help",
      title: "Task dependencies: blocks and blocked-by",
      category: "planning",
      tags: ["dependencies", "blocked", "blocks", "chip", "ordering"],
      body: `Dependencies are **directional**: an item *blocks* others and can be *blocked by* others. Manage both lists from the item's drawer.

## Where blocking shows up

- A **Blocked chip** on the item's board card — visible without opening anything
- A **blocked outline** on the item's timeline bar
- The dependency lists in the drawer, with each linked item one click away

Dependencies express ordering, not hierarchy — for parent/child structure, use epics. Keep chains short: a dependency graph you can't see at a glance is a planning smell.`,
      related: ["timeline-help", "board-basics", "item-drawer"],
    },

    // ---------- Work items ----------
    {
      id: "item-drawer",
      title: "Creating and editing work items",
      category: "items",
      featured: true,
      tags: ["items", "create", "drawer", "metadata", "estimate", "labels", "deep link"],
      body: `Press \`c\` anywhere (or the **+ New item** button) to create a work item. The new item opens straight into the **drawer** — the right-hand panel where everything about an item lives.

## In the drawer

- **Title and description**
- **Type** (feature, bug, chore, epic…), **priority**, **assignee**, **epic**, **stage**
- **Estimate** in points, **start/due dates**, **labels**
- The structured **spec**, **dependencies**, **custom fields**, **cycle**, and the **comment thread**
- **Agent brief** and **Draft PR** generators

## Deep links

The drawer is **deep-linkable** — the URL updates as you open an item, so pasting the link to a teammate opens the same item in the same place. Edits save optimistically; you never hit a Save button for metadata.`,
      related: ["custom-fields", "comments-mentions", "agent-brief"],
    },
    {
      id: "custom-fields",
      title: "Custom fields",
      category: "items",
      tags: ["custom fields", "typed", "select", "url", "number"],
      body: `Projects can define **typed custom fields** that appear on every item's drawer:

- **Text** — free-form strings
- **Number** — numeric values
- **Select** — one choice from a defined option list
- **URL** — rendered as a link

Define the fields once per project; edit values on each item in the drawer's custom-fields section.

Reach for a select field before a label when the values are mutually exclusive (an environment, a customer tier) — labels are for overlapping traits, selects for one-of choices.`,
      related: ["item-drawer", "backlog-bulk"],
    },
    {
      id: "backlog-bulk",
      title: "The backlog and bulk edit",
      category: "items",
      featured: true,
      tags: ["backlog", "table", "filter", "sort", "bulk", "multi-select", "inline edit"],
      body: `**Backlog** is the dense table view: every item in the project, sortable and filterable by type, text, and assignee, with **inline edits** — change an item's stage right in the row.

## Bulk edit

Multi-select rows (there's a select-all) and act on the whole selection in one move:

- **Restage** — send five items to Ready at once
- **Reassign** — hand a batch to one person
- **Set priority**
- **Delete**

The backlog is where grooming happens: filter to a slice, sort it, fix it in bulk, and get back to the board.`,
      related: ["item-drawer", "saved-views"],
    },
    {
      id: "comments-mentions",
      title: "Comments, threads, and @mentions",
      category: "items",
      tags: ["comments", "threads", "reply", "mentions", "autocomplete"],
      body: `Every item's drawer carries a **comment thread**. Comments support **replies** — discussions stay threaded under the comment that started them rather than interleaving.

## @mentions

Type \`@\` and an **autocomplete** of project members appears; picking one inserts a highlighted mention. Mentioned users see the comment in their **Inbox** under Mentions, with the sidebar badge ticking up.

Keep decisions in the thread of the item they're about — a decision made in chat is a decision the next reader of the spec never sees.`,
      related: ["inbox-help", "item-drawer"],
    },

    // ---------- Workflow & insights ----------
    {
      id: "workflow-stages",
      title: "Configuring your workflow stages",
      category: "workflow-admin",
      featured: true,
      tags: ["workflow", "stages", "columns", "wip limit", "reorder", "rename", "categories"],
      body: `**Workflow** in the sidebar (the settings page) is where the board's columns are shaped — and there's **no admin gate**: the workflow belongs to the team.

## Per stage you can

- **Add, rename, recolor, reorder, delete** stages — changes reflect on the board immediately
- Set the stage's **category** (backlog / in-progress / done buckets that power metrics like WIP and cycle time)
- Set a **WIP limit** — the board shows when a column exceeds it, and Insights charts WIP against limits

Deleting a stage asks where its items should go, so nothing is orphaned. Start from the seeded flow and carve it to match how your team actually works — the tool follows the team, not the reverse.`,
      related: ["board-basics", "insights-flow"],
    },
    {
      id: "insights-flow",
      title: "Insights: the dashboard and flow metrics",
      category: "workflow-admin",
      featured: true,
      tags: ["insights", "metrics", "cycle time", "throughput", "wip aging", "spec coverage", "dashboard"],
      body: `**Insights** turns the project into numbers:

- **Stat tiles** and distributions by stage, type, and priority
- A **spec coverage** donut — how much in-flight work actually has a spec
- **Estimate points** progress and **WIP vs limits**

## Flow metrics

The Flow section derives from the item's full stage-transition history:

- **Cycle time** — median and p85 days from start to done
- **Throughput** — completed items bucketed per week
- **WIP aging** — every in-progress item with its age in days, oldest first, so stale work can't hide

When cycle time creeps up, check WIP aging first — it names the cards that are quietly stuck.`,
      related: ["workflow-stages", "specs-overview"],
    },
  ],
};
