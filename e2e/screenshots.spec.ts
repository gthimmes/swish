import { test } from "./fixtures";

// Utility "test" that captures reference screenshots of the main views.
// Run with: npx playwright test screenshots.spec.ts
test.describe("Screenshots", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("board (stage view)", async ({ page }) => {
    await page.goto("/board");
    await page.getByTestId("board").waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "docs/board.png", fullPage: false });
  });

  test("board grouped by assignee", async ({ page }) => {
    await page.goto("/board");
    await page.getByTestId("board").waitFor();
    await page.getByTestId("group-by").selectOption("assignee");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "docs/board-swimlanes.png", fullPage: false });
  });

  test("spec editor drawer", async ({ page }) => {
    await page.goto("/board");
    await page.locator('[data-key="SWISH-3"]').first().click();
    await page.getByTestId("spec-editor").waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/spec-editor.png", fullPage: false });
  });

  test("backlog", async ({ page }) => {
    await page.goto("/backlog");
    await page.getByTestId("backlog-table").waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/backlog.png", fullPage: false });
  });

  test("workflow settings", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("stage-list").waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/settings.png", fullPage: false });
  });
});
