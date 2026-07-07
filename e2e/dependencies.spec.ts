import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

test.describe("Task dependencies", () => {
  test("board card shows a Blocked chip when a blocker is unfinished", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    // SWISH-23 (realtime) is blocked by SWISH-22 (auth, in Spec).
    await expect(page.locator('[data-key="SWISH-23"]').first().getByTestId("blocked-chip")).toBeVisible();
  });

  test("drawer lists blocked-by dependencies", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-23");
    const row = page.getByTestId("dep-blocked-by-row").filter({ hasText: "SWISH-22" });
    await expect(row).toBeVisible();
  });

  test("adds and removes a dependency", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-16"); // no deps

    // Add "blocked by SWISH-3" (resolve the option value first).
    const addSelect = page.getByTestId("dep-blocked-by-add");
    const value = await addSelect.locator("option", { hasText: "SWISH-3 —" }).getAttribute("value");
    const addSaved = page.waitForResponse((r) => /\/dependencies$/.test(r.url()) && r.request().method() === "POST");
    await addSelect.selectOption(value!);
    await addSaved;
    const row = page.getByTestId("dep-blocked-by-row").filter({ hasText: "SWISH-3" });
    await expect(row).toBeVisible();

    // Remove it.
    const delSaved = page.waitForResponse((r) => /\/api\/dependencies\//.test(r.url()) && r.request().method() === "DELETE");
    await row.getByTestId("dep-blocked-by-remove").click();
    await delSaved;
    await expect(page.getByTestId("dep-blocked-by-row").filter({ hasText: "SWISH-3" })).toHaveCount(0);
  });

  test("timeline flags a blocked scheduled item", async ({ page }) => {
    await page.goto("/timeline");
    // SWISH-28 is scheduled and blocked by SWISH-22.
    const bar = page.locator('[data-testid="timeline-row"][data-key="SWISH-28"]').getByTestId("timeline-bar");
    await expect(bar).toHaveAttribute("data-blocked", "true");
  });
});
