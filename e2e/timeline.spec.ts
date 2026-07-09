import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

test.describe("Timeline & dates", () => {
  test("renders scheduled work grouped into bars", async ({ page }) => {
    await page.goto("/timeline");
    await expect(page.getByTestId("timeline-group").first()).toBeVisible();
    await expect(page.getByTestId("timeline-bar").first()).toBeVisible();
    await expect(page.getByTestId("timeline-today")).toBeVisible();
  });

  test("draws dependency arrows between scheduled bars", async ({ page }) => {
    await page.goto("/timeline");
    await page.getByTestId("timeline-bar").first().waitFor();
    // SWISH-22 (auth) blocks SWISH-28 (AI criteria); both are scheduled.
    await expect(page.getByTestId("dep-arrow").first()).toBeVisible();
  });

  test("flags an overdue item", async ({ page }) => {
    await page.goto("/timeline");
    // SWISH-20 (bug, In Progress) is seeded with a past due date.
    const bar = page.locator('[data-testid="timeline-row"][data-key="SWISH-20"]').getByTestId("timeline-bar");
    await expect(bar).toHaveAttribute("data-overdue", "true");
  });

  test("clicking a bar opens the item drawer", async ({ page }) => {
    await page.goto("/timeline");
    await page.getByTestId("timeline-bar").first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
  });

  test("setting a due date persists and shows on the backlog", async ({ page }) => {
    await page.goto("/backlog");
    await openCard(page, "SWISH-16");
    const saved = page.waitForResponse(
      (r) => /\/api\/items\//.test(r.url()) && r.request().method() === "PATCH"
    );
    await page.getByTestId("drawer-due").fill("2026-07-15");
    await saved;
    await page.reload();
    await openCard(page, "SWISH-16");
    await expect(page.getByTestId("drawer-due")).toHaveValue("2026-07-15");
  });

  test("overdue due dates render on board cards", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    // SWISH-20 is overdue; its card shows an overdue due chip.
    const chip = page.locator('[data-key="SWISH-20"]').first().getByTestId("due-chip");
    await expect(chip).toHaveAttribute("data-overdue", "true");
  });
});
