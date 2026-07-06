import { test, expect } from "./fixtures";

test.describe("Board", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
  });

  test("renders configurable stage columns", async ({ page }) => {
    const columns = page.getByTestId("column");
    await expect(columns).toHaveCount(6);
    for (const name of ["Backlog", "Spec", "Ready", "In Progress", "In Review", "Done"]) {
      await expect(page.locator(`[data-stage="${name}"]`)).toBeVisible();
    }
  });

  test("renders seeded cards", async ({ page }) => {
    await expect(page.getByTestId("board-card").first()).toBeVisible();
    const count = await page.getByTestId("board-card").count();
    expect(count).toBeGreaterThan(10);
    await expect(page.locator('[data-key="SWISH-1"]')).toBeVisible();
  });

  test("creates a new work item via modal", async ({ page }) => {
    await page.getByTestId("new-item").click();
    await page.getByTestId("new-item-title").fill("Playwright-created item");
    await page.getByTestId("new-item-submit").click();

    // Drawer opens on the created item.
    await expect(page.getByTestId("item-drawer")).toBeVisible();
    await expect(page.getByTestId("drawer-title")).toHaveValue("Playwright-created item");

    await page.getByTestId("drawer-close").click();
    await expect(page.locator('[data-key]', { hasText: "Playwright-created item" })).toBeVisible();
  });

  test("switches swimlane grouping to assignee", async ({ page }) => {
    await expect(page.getByTestId("swimlane")).toHaveCount(1);
    await page.getByTestId("group-by").selectOption("assignee");
    // Multiple lanes appear, one per assignee with items.
    await expect(async () => {
      const lanes = await page.getByTestId("swimlane").count();
      expect(lanes).toBeGreaterThan(1);
    }).toPass();
    await expect(page.locator('[data-lane]').first()).toBeVisible();
  });
});
