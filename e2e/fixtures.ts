import { test as base, expect } from "@playwright/test";

/**
 * Every test starts from a freshly seeded database via the in-process
 * test-reset endpoint, guaranteeing deterministic, isolated state.
 */
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  page: async ({ page, request }, use) => {
    const res = await request.post("/api/test/reset");
    if (!res.ok()) throw new Error(`DB reset failed: ${res.status()}`);
    await use(page);
  },
});

export { expect };
