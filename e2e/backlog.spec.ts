import { test, expect } from "./fixtures";
import { fetchItems, findUserId } from "./helpers";

test.describe("Backlog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backlog");
    await expect(page.getByTestId("backlog-table")).toBeVisible();
  });

  test("lists every seeded item", async ({ page, request }) => {
    const items = await fetchItems(request);
    await expect(page.getByTestId("backlog-row")).toHaveCount(items.length);
  });

  test("filters by type", async ({ page, request }) => {
    const bugs = await fetchItems(request, { type: "BUG" });
    expect(bugs.length).toBeGreaterThan(0);
    await page.getByTestId("filter-type").selectOption("BUG");
    await expect(page.getByTestId("backlog-row")).toHaveCount(bugs.length);
  });

  test("filters by text search", async ({ page, request }) => {
    const matches = await fetchItems(request, { q: "dark mode" });
    expect(matches.length).toBeGreaterThan(0);
    await page.getByTestId("filter-search").fill("dark mode");
    await expect(page.getByTestId("backlog-row")).toHaveCount(matches.length);
  });

  test("filters by assignee", async ({ page, request }) => {
    const miraId = await findUserId(request, "Mira Patel");
    const miraItems = await fetchItems(request, { assigneeId: miraId });
    expect(miraItems.length).toBeGreaterThan(0);
    await page.getByTestId("filter-assignee").selectOption({ label: "Mira Patel" });
    const rows = page.getByTestId("backlog-row");
    await expect(rows).toHaveCount(miraItems.length);
    await expect(rows.filter({ hasText: "Mira Patel" })).toHaveCount(miraItems.length);
  });

  test("sorts by priority", async ({ page }) => {
    await page.getByRole("button", { name: /Priority/ }).click();
    // First row after ascending priority-weight sort should be Urgent.
    await expect(page.getByTestId("backlog-row").first()).toContainText("Urgent");
  });

  test("inline stage change persists", async ({ page }) => {
    // SWISH-10 (AI spec-gen spike) starts in Backlog; move it to Done.
    const row = page.locator('[data-testid="backlog-row"][data-key="SWISH-10"]');
    await row.getByTestId("row-stage").selectOption({ label: "Done" });
    await page.reload();
    await expect(page.getByTestId("backlog-table")).toBeVisible();
    const label = await page
      .locator('[data-testid="backlog-row"][data-key="SWISH-10"]')
      .getByTestId("row-stage")
      .locator("option:checked")
      .textContent();
    expect(label).toBe("Done");
  });

  test("clicking a row opens the drawer", async ({ page }) => {
    await page.locator('[data-testid="backlog-row"][data-key="SWISH-1"]').getByTestId("backlog-item-cell").click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByTestId("drawer-key")).toHaveText("SWISH-1");
  });
});
