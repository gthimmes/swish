import { test, expect } from "./fixtures";

test.describe("Backlog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backlog");
    await expect(page.getByTestId("backlog-table")).toBeVisible();
  });

  test("lists all seeded items", async ({ page }) => {
    const rows = page.getByTestId("backlog-row");
    await expect(rows).toHaveCount(16);
  });

  test("filters by type", async ({ page }) => {
    await page.getByTestId("filter-type").selectOption("BUG");
    await expect(page.getByTestId("backlog-row")).toHaveCount(1);
    await expect(page.locator('[data-key="SWISH-12"]')).toBeVisible();
  });

  test("filters by text search", async ({ page }) => {
    await page.getByTestId("filter-search").fill("dark mode");
    await expect(async () => {
      const n = await page.getByTestId("backlog-row").count();
      expect(n).toBe(1);
    }).toPass();
  });

  test("filters by assignee", async ({ page }) => {
    await page.getByTestId("filter-assignee").selectOption({ label: "Mira Patel" });
    const rows = page.getByTestId("backlog-row");
    // Mira owns 4 seeded items; toHaveCount retries through the load.
    await expect(rows).toHaveCount(4);
    await expect(rows.filter({ hasText: "Mira Patel" })).toHaveCount(4);
  });

  test("sorts by priority", async ({ page }) => {
    await page.getByRole("button", { name: /Priority/ }).click();
    // First row after sorting ascending by priority weight should be Urgent.
    const firstRow = page.getByTestId("backlog-row").first();
    await expect(firstRow).toContainText("Urgent");
  });

  test("inline stage change persists", async ({ page }) => {
    const row = page.locator('[data-testid="backlog-row"][data-key="SWISH-16"]');
    await row.getByTestId("row-stage").selectOption({ label: "Done" });
    await page.reload();
    await expect(page.getByTestId("backlog-table")).toBeVisible();
    await expect(
      page.locator('[data-testid="backlog-row"][data-key="SWISH-16"]').getByTestId("row-stage")
    ).toHaveValue(/.+/);
    const label = await page
      .locator('[data-testid="backlog-row"][data-key="SWISH-16"]')
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
