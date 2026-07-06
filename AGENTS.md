<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working practice: dogfood the roadmap in Swish

**Swish tracks its own development. Use it.** The board is the source of truth for what's built, what's in flight, and what's next — and it must always reflect reality.

Every development cycle follows this loop:

1. **Write the work into Swish first.** Before starting a feature, make sure it exists as a work item (a `WorkItem`, usually under the right roadmap epic). If it's new/future work, add it to **Backlog**. Give near-term items a real spec — Problem, Goals, Non-Goals, Approach, Risks — with acceptance criteria and a test plan. That spec is what you build against.
2. **Move it through the stages as you go.** `Backlog → Spec → Ready → In Progress → In Review → Done`. Update the item's stage to match what you're actually doing; don't let the board drift from reality.
3. **Always close the loop when done.** When a feature ships, move it to **Done**, check the acceptance criteria that genuinely pass, and set each test-plan item to `PASS`/`FAIL`/`TODO` honestly (only `PASS` what an automated test actually covers). Mark the spec `APPROVED`. Never mark something Done that isn't built and passing.
4. **Keep the roadmap growing.** As new work is discovered, add it as Backlog items under the appropriate epic so "what's next" is always visible.

## How the board is stored

- The board's state lives in **`src/lib/seed.ts`** (`seedDatabase`), which is the single source of truth shared by the CLI seed (`npm run db:seed`) and the test-reset endpoint (`/api/test/reset`). Edit item status/criteria/tests there to record progress durably.
- Apply changes with `npm run db:seed` (or `npm run db:reset`), or hit `POST /api/test/reset` against a running dev server.

## The seed is also the E2E fixture — keep tests data-driven

The same seed is what Playwright reseeds before each test (`e2e/fixtures.ts`). So when you change item status or counts:

- Prefer **data-driven assertions** — derive expected counts from the API via `e2e/helpers.ts` (`fetchItems`, `findUserId`) rather than hardcoding numbers, so the suite survives the roadmap growing.
- Keep item-specific tests pinned to **stable, delivered items** (low SWISH-N keys), and add new/roadmap work at higher keys so those references don't shift.
- After any board change, run `npm run test:e2e` and get back to green before considering the cycle done.
