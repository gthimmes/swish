import { test, expect } from "./fixtures";
import { getProjectId } from "./helpers";

test.describe("Flow metrics", () => {
  test("API derives cycle time, throughput and WIP aging from transition history", async ({ request }) => {
    const projectId = await getProjectId(request);
    const res = await request.get(`/api/projects/${projectId}/flow`);
    expect(res.ok()).toBeTruthy();
    const flow = await res.json();

    // Cycle time: seeded Done items produce a positive median and p85 over many samples.
    expect(flow.cycleTime.count).toBeGreaterThan(0);
    expect(flow.cycleTime.medianDays).toBeGreaterThan(0);
    expect(flow.cycleTime.p85Days).toBeGreaterThanOrEqual(flow.cycleTime.medianDays);

    // Throughput: completed items are bucketed into weekly counts that sum to the total.
    expect(Array.isArray(flow.throughput.weeks)).toBeTruthy();
    const summed = flow.throughput.weeks.reduce((n: number, w: { count: number }) => n + w.count, 0);
    expect(summed).toBe(flow.throughput.total);
    expect(flow.throughput.total).toBeGreaterThan(0);

    // WIP aging: in-progress items are listed, sorted oldest-first.
    expect(flow.wip.count).toBeGreaterThan(0);
    expect(flow.wip.items.length).toBe(flow.wip.count);
    for (let i = 1; i < flow.wip.items.length; i++) {
      expect(flow.wip.items[i - 1].ageDays).toBeGreaterThanOrEqual(flow.wip.items[i].ageDays);
    }
  });

  test("Insights renders the Flow section", async ({ page }) => {
    await page.goto("/insights");
    await expect(page.getByTestId("flow-section")).toBeVisible();
    await expect(page.getByTestId("cycletime-median")).toContainText("days median");
    await expect(page.getByTestId("throughput-bar").first()).toBeVisible();
    await expect(page.getByTestId("wipaging-row").first()).toBeVisible();
  });
});
