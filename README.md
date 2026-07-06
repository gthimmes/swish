# Swish

**Spec-first work tracking for modern engineering teams.** Methodology-agnostic boards, fully configurable swimlanes, and first-class structured specs — so humans and AI agents share one precise source of truth for every piece of work.

> Jira feels like an IT ticketing system repurposed for agile teams. Swish is built from primitives: a configurable workflow, swimlanes you can toggle along any dimension, and specs that are structured and reviewable rather than a freeform text blob. See [`SPEC.md`](./SPEC.md) for the full product spec.

## Highlights

- **Configurable board** — columns are your workflow stages. Add, rename, recolor, reorder, delete, set categories and WIP limits. No admin gate.
- **Swimlanes as a first-class toggle** — group the board instantly by assignee, epic, priority, or type. Drag a card across lanes to reassign that dimension.
- **Drag-and-drop** — move cards between stages and reorder within a column (accessible `@dnd-kit`, optimistic + persisted).
- **Structured specs** — every item can carry a spec with Problem, Goals, Non-Goals, Approach, and Risks; a checkable **acceptance criteria** list; and a **test plan** with pass/fail tracking. Status flows Draft → In Review → Approved.
- **Backlog** — dense, sortable, filterable table with inline edits.
- **Specs overview** — every spec at a glance, filterable by status, with criteria/test progress.
- **Fast** — optimistic updates, keyboard-friendly, deep-linkable item drawer.

## Tech stack

| Layer | Choice |
|---|---|
| UI + API | Next.js 16 (App Router) + React 19 + TypeScript |
| Data | Prisma 7 + SQLite (better-sqlite3 driver adapter) |
| Styling | Tailwind CSS 4 (custom dark design system) |
| Drag & drop | `@dnd-kit` |
| Data fetching | SWR (optimistic mutations) |
| E2E tests | Playwright |

## Getting started

```bash
npm install                 # install dependencies
npx prisma migrate dev      # create the SQLite DB + schema (first run)
npm run db:seed             # load demo data (Swish dogfooding its own build)
npm run dev                 # http://localhost:3000
```

Useful scripts:

```bash
npm run db:seed      # reseed demo data
npm run db:reset     # drop, re-migrate, and reseed
npm run test:e2e     # run the Playwright suite (reseeds first)
npm run test:e2e:ui  # Playwright interactive UI
```

## Architecture

```
src/
  app/
    (app)/                 # authenticated app shell (sidebar + drawer)
      board/               # configurable board with swimlanes + DnD
      backlog/             # sortable/filterable table
      specs/               # spec overview
      settings/            # workflow (stage) configuration
    api/                   # REST route handlers (see SPEC.md §7)
  components/
    board/                 # BoardView, BoardCard (DnD)
    ItemDrawer.tsx         # item detail + metadata editing
    SpecEditor.tsx         # structured spec + criteria + test plan
    workspace.tsx          # project/user context, drawer deep-linking
    ...
  lib/
    db.ts                  # Prisma client (SQLite adapter)
    enums.ts               # enum-like constants + display metadata
    grouping.ts            # swimlane computation (pure view logic)
    include.ts             # shared Prisma include shapes
    client.ts              # SWR hooks + fetch helpers
prisma/
  schema.prisma            # data model
  seed.ts                  # demo data
e2e/                       # Playwright specs
```

### Data model (short version)

`Project` → many `Stage` (ordered workflow columns) and many `WorkItem`. A `WorkItem` has a type, priority, assignee, optional epic (self-referential), labels, and an optional one-to-one `Spec`. A `Spec` has structured sections plus ordered `AcceptanceCriterion` and `TestPlanItem` rows. Swimlanes are **not** stored — they're computed at render time from item fields, which is why grouping is instant and reconfigurable.

## Testing

The Playwright suite (`e2e/`) drives the real UI and covers:

- Board render, stage columns, seeded cards
- Item creation via the modal
- **Drag-and-drop** move between stages, with persistence and drawer reflection
- Swimlane group-by switching
- Spec editing (sections, status), acceptance-criteria toggle/add, test-plan status cycling
- Item metadata editing from the drawer
- Backlog listing, filtering (type/text/assignee), sorting, inline stage edits
- Workflow settings: add / rename / reorder / delete stages, reflected on the board

`globalSetup` reseeds the database before each run so tests are deterministic.

## Status

Built in a single focused session as a full-featured v1. See [`SPEC.md`](./SPEC.md) §8 for the milestone plan and §2 for goals / non-goals.
