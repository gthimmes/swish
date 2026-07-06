import { test, expect } from "./fixtures";
import { fetchItems, getProject } from "./helpers";

test.describe("Insights", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/insights");
    await expect(page.getByTestId("stat-tiles")).toBeVisible();
  });

  test("total stat matches the item count", async ({ page, request }) => {
    const items = await fetchItems(request);
    await expect(page.getByTestId("stat-total")).toContainText(String(items.length));
  });

  test("done stat matches items in Done-category stages", async ({ page, request }) => {
    const [items, project] = await Promise.all([fetchItems(request), getProject(request)]);
    const doneStageIds = new Set(project.stages.filter((s) => s.category === "DONE").map((s) => s.id));
    // fetchItems() returns key/type/etc but not stageId; re-fetch raw for stageId.
    const raw = await (await request.get(`/api/items?projectId=${project.id}`)).json();
    const done = raw.filter((i: { stageId: string }) => doneStageIds.has(i.stageId)).length;
    expect(done).toBeGreaterThan(0);
    await expect(page.getByTestId("stat-done")).toContainText(String(done));
    void items;
  });

  test("renders every metric panel", async ({ page }) => {
    for (const id of ["chart-stage", "chart-spec", "chart-type", "chart-priority", "chart-points", "chart-wip"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
  });

  test("spec coverage donut shows a percentage", async ({ page }) => {
    await expect(page.getByTestId("donut-value")).toContainText("%");
  });

  test("WIP panel shows the In Progress limit", async ({ page }) => {
    const row = page.getByTestId("wip-row").filter({ hasText: "In Progress" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("/4");
  });
});
