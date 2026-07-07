import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

test.describe("Cycles / sprints", () => {
  test("lists seeded cycles with status and progress", async ({ page }) => {
    await page.goto("/cycles");
    await expect(page.getByTestId("cycle")).toHaveCount(2);
    await expect(page.locator('[data-testid="cycle"][data-name="Sprint 24"]')).toContainText("Completed");
    await expect(page.locator('[data-testid="cycle"][data-name="Sprint 24"]')).toContainText("100%");
    await expect(page.locator('[data-testid="cycle"][data-name="Sprint 25"]')).toContainText("Active");
  });

  test("assigns an item to a cycle from the drawer", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-16"); // not in any cycle
    const saved = page.waitForResponse(
      (r) => /\/api\/items\//.test(r.url()) && r.request().method() === "PATCH"
    );
    await page.getByTestId("drawer-cycle").selectOption({ label: "Sprint 25" });
    await saved;

    await page.goto("/cycles");
    await expect(
      page.locator('[data-testid="cycle"][data-name="Sprint 25"] [data-testid="cycle-item"][data-key="SWISH-16"]')
    ).toBeVisible();
  });

  test("creates a new cycle", async ({ page }) => {
    await page.goto("/cycles");
    await page.getByTestId("new-cycle").click();
    await page.getByTestId("cycle-name").fill("Sprint 26");
    await page.getByTestId("cycle-start").fill("2026-07-15");
    await page.getByTestId("cycle-end").fill("2026-07-29");
    await page.getByTestId("cycle-submit").click();
    await expect(page.locator('[data-testid="cycle"][data-name="Sprint 26"]')).toBeVisible();
    await expect(page.getByTestId("cycle")).toHaveCount(3);
  });

  test("deletes a cycle", async ({ page }) => {
    await page.goto("/cycles");
    await page.locator('[data-testid="cycle"][data-name="Sprint 24"]').getByTestId("cycle-delete").click();
    await expect(page.getByTestId("cycle")).toHaveCount(1);
  });
});
