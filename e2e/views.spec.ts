import { test, expect } from "./fixtures";

test.describe("Saved views", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
  });

  test("lists the seeded views", async ({ page }) => {
    await page.getByTestId("views-button").click();
    await expect(page.getByTestId("saved-view")).toHaveCount(3);
    await expect(page.locator('[data-view-name="Open bugs"]')).toBeVisible();
  });

  test("applies a filter view", async ({ page }) => {
    await page.getByTestId("views-button").click();
    await page.locator('[data-view-name="Open bugs"]').click();
    await expect(page.getByTestId("filter-type")).toHaveValue("BUG");
    // Only bug cards remain on the board.
    await expect(page.getByTestId("board-card")).toHaveCount(1);
  });

  test("applies a grouping view (swimlanes)", async ({ page }) => {
    await page.getByTestId("views-button").click();
    await page.locator('[data-view-name="By assignee"]').click();
    await expect(page.getByTestId("group-by")).toHaveValue("assignee");
    await expect(async () => {
      expect(await page.getByTestId("swimlane").count()).toBeGreaterThan(1);
    }).toPass();
  });

  test("saves the current view", async ({ page }) => {
    await page.getByTestId("filter-priority").selectOption("HIGH");
    await page.getByTestId("views-button").click();
    await page.getByTestId("save-view").click();
    await page.getByTestId("view-name-input").fill("High priority");
    await page.getByTestId("view-save-submit").click();

    await page.getByTestId("views-button").click();
    await expect(page.locator('[data-view-name="High priority"]')).toBeVisible();
    await expect(page.getByTestId("saved-view")).toHaveCount(4);
  });

  test("deletes a view", async ({ page }) => {
    await page.getByTestId("views-button").click();
    await page
      .getByTestId("saved-view")
      .filter({ hasText: "Open bugs" })
      .getByTestId("delete-view")
      .click();
    await expect(page.getByTestId("saved-view")).toHaveCount(2);
  });
});
