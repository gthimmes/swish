# Swish — Spec-First Work Tracking for Modern Engineering Teams

> **Swish** is a work tracking tool built for how software teams actually work today: methodology-agnostic boards, fully configurable swimlanes, and **first-class, structured specs** so that both humans and AI agents have a well-defined source of truth for every piece of work.

## 1. Product Thesis

Jira feels like an IT ticketing system repurposed for agile teams. It's rigid, ceremony-heavy, and treats the *description* of work as an afterthought — a freeform text blob. In an era where a large share of engineering work is executed with AI agents, the **spec** is the highest-leverage artifact. A vague ticket produces vague output; a precise spec produces precise output.

Swish is built on three principles:

1. **Methodology-agnostic.** The board is a configurable workflow of stages, not a hard-coded Scrum/Kanban model. Teams define their own stages, their own swimlanes, their own cadence.
2. **Swimlanes are a first-class, configurable dimension.** Group the board by anything — assignee, epic, priority, work type, or a custom field — and switch instantly.
3. **Spec-first.** Every work item can carry a structured spec: context, requirements, acceptance criteria, technical design, and a test plan. Specs are structured (not a text blob) so they're reviewable, checkable, and consumable by AI agents.

## 2. Goals & Non-Goals

### Goals (v1, buildable today)
- A fast, keyboard-friendly **board** with drag-and-drop across stages.
- **Configurable workflow**: add / rename / reorder / recolor / delete stages per project.
- **Configurable swimlanes**: group the board by assignee, epic, priority, type, or none.
- **Structured spec editor** attached to any work item, with acceptance criteria as trackable checklist items.
- **Backlog / list view** with sorting and filtering.
- **Work item detail** with full editing, comments/activity, spec, and metadata.
- **Filtering & search** across the board and backlog.
- Local persistence (SQLite) with a clean REST API.
- **Comprehensive E2E tests** (Playwright) validating the real UI.

### Non-Goals (v1)
- Auth / multi-tenant SSO (single local workspace; a `currentUser` is seeded).
- Real-time multiplayer sync (optimistic single-client updates).
- Mobile-native apps (responsive web only).
- Third-party integrations (GitHub/Slack) — designed for, not built.

## 3. Core Concepts & Data Model

### Entities

- **Project** — a container for work. Has its own workflow (ordered stages) and default swimlane config.
- **Stage** (workflow column) — an ordered, named, colored state within a project. Has an optional `category` (`BACKLOG | IN_PROGRESS | DONE`) used for metrics and WIP semantics. Fully user-editable.
- **WorkItem** — the unit of work. Fields:
  - `key` (e.g. `SWISH-42`), `title`, `type` (`STORY | TASK | BUG | SPIKE | EPIC`), `stageId`, `priority` (`URGENT | HIGH | MEDIUM | LOW`), `assigneeId`, `epicId` (self-referential to an EPIC item), `estimate` (points), `rank` (float for ordering), `labels`, timestamps.
- **Spec** — one-to-one with a WorkItem. Structured sections:
  - `problem` (why / context), `goals`, `nonGoals`, `approach` (technical design), `risks`, `status` (`DRAFT | IN_REVIEW | APPROVED`).
  - **AcceptanceCriteria[]** — ordered, checkable statements (Given/When/Then friendly), each `done: boolean`.
  - **TestPlanItem[]** — ordered test scenarios, each with a `status` (`TODO | PASS | FAIL`).
- **User** — id, name, avatar color, initials. Assignable.
- **Label** — id, name, color.
- **Comment / Activity** — timestamped events and user comments on an item.

### Swimlane grouping
Swimlanes are computed at render time from a `groupBy` selection: `none | assignee | epic | priority | type`. No schema needed beyond the item fields — swimlanes are a **view concern**, which is why they're instantly reconfigurable.

## 4. Key Views

1. **Board** — columns = stages, rows = swimlanes. Drag cards between stages (updates `stageId`) and reorder within a column (`rank`). Toolbar: project switcher, `Group by` (swimlane) selector, filters, search, new item.
2. **Backlog / List** — dense table of items, sortable and filterable, inline stage/assignee/priority edit, quick-add.
3. **Item Detail** — drawer/page: title, type, stage, assignee, priority, estimate, epic, labels; **Spec** tab (structured editor + acceptance criteria + test plan); Activity.
4. **Workflow Settings** — reorder/add/rename/recolor stages; set stage category.
5. **Specs overview** — all items that have specs, filterable by spec status (Draft/In Review/Approved).

## 5. Differentiators vs. Jira

| | Jira | Swish |
|---|---|---|
| Workflow | Rigid, admin-gated schemes | Per-project, inline-editable stages |
| Swimlanes | Limited, buried in config | First-class toolbar toggle, any dimension |
| Spec | Freeform description blob | Structured, reviewable, AI-consumable spec with acceptance criteria + test plan |
| Speed | Heavy, slow | Optimistic, keyboard-first, instant |
| Methodology | Scrum/Kanban assumptions baked in | Methodology-agnostic primitives |

## 6. Tech Stack

- **Next.js (App Router) + TypeScript** — UI + API routes.
- **Prisma + SQLite** — zero-config local persistence, typed queries.
- **Tailwind CSS** — styling.
- **@dnd-kit** — accessible drag-and-drop for the board.
- **Playwright** — E2E validation of every major flow.

## 7. API Surface (REST)

```
GET    /api/projects
GET    /api/projects/:id            (project + stages)
POST   /api/projects/:id/stages     create stage
PATCH  /api/stages/:id              rename/recolor/reorder/category
DELETE /api/stages/:id
GET    /api/items?projectId=&groupBy=&filters   board/backlog data
POST   /api/items                   create work item (+ optional spec)
GET    /api/items/:id               item + spec + activity
PATCH  /api/items/:id               update fields / move stage / rank
DELETE /api/items/:id
PUT    /api/items/:id/spec          upsert structured spec
POST   /api/items/:id/criteria      add acceptance criterion
PATCH  /api/criteria/:id            toggle/edit
POST   /api/items/:id/tests         add test plan item
PATCH  /api/tests/:id               set status
GET    /api/users
```

## 8. Milestones (execution order for today)

1. Scaffold + Prisma schema + seed data.
2. API routes for projects/stages/items/specs.
3. Board view with configurable columns.
4. Configurable swimlanes (group-by).
5. Drag-and-drop move + reorder.
6. Item detail + structured spec editor + acceptance criteria + test plan.
7. Backlog/list view + filtering/search.
8. Workflow settings (edit stages).
9. Playwright E2E suite covering all of the above.
10. Polish, empty states, keyboard shortcuts, docs.

## 9. Definition of Done
- App runs with `npm run dev`, seeds meaningful demo data.
- Every view in §4 is usable.
- Playwright suite passes and covers: board render, drag move, group-by switch, item create, spec edit + criteria toggle, backlog filter, stage config.
- README documents setup, architecture, and how to run tests.
