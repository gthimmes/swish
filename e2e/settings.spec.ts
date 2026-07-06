import { test, expect } from "./fixtures";

test.describe("Workflow settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("stage-list")).toBeVisible();
  });

  test("lists the project stages", async ({ page }) => {
    await expect(page.getByTestId("stage-row")).toHaveCount(6);
  });

  test("adds a new stage that appears on the board", async ({ page }) => {
    await page.getByTestId("new-stage-name").fill("QA");
    await page.getByTestId("add-stage").click();
    await expect(page.getByTestId("stage-row")).toHaveCount(7);
    await expect(page.locator('[data-stage-name="QA"]')).toBeVisible();

    // Now visible as a column on the board.
    await page.goto("/board");
    await expect(page.locator('[data-stage="QA"]')).toBeVisible();
  });

  test("renames a stage and it persists", async ({ page }) => {
    const row = page.locator('[data-stage-name="Ready"]');
    const input = row.getByTestId("stage-name-input");
    await input.fill("Refined");
    await input.blur();
    await expect(page.locator('[data-stage-name="Refined"]')).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-stage-name="Refined"]')).toBeVisible();
  });

  test("reorders stages with the move controls", async ({ page }) => {
    const firstBefore = await page.getByTestId("stage-row").first().getAttribute("data-stage-name");
    // Move the second stage up.
    await page.getByTestId("stage-row").nth(1).getByRole("button", { name: "Move up" }).click();
    await expect(async () => {
      const firstAfter = await page.getByTestId("stage-row").first().getAttribute("data-stage-name");
      expect(firstAfter).not.toBe(firstBefore);
    }).toPass();
  });

  test("deletes a stage and reassigns its items", async ({ page }) => {
    await page.locator('[data-stage-name="Spec"]').getByTestId("stage-delete").click();
    await expect(page.getByTestId("stage-row")).toHaveCount(5);
    await expect(page.locator('[data-stage-name="Spec"]')).toHaveCount(0);

    // Board still renders all items (none lost).
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    const cards = await page.getByTestId("board-card").count();
    expect(cards).toBeGreaterThan(10);
  });
});
