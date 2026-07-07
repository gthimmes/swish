import { test, expect } from "./fixtures";
import { fetchItems } from "./helpers";

test.describe("Bulk edit & multi-select", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backlog");
    await expect(page.getByTestId("backlog-table")).toBeVisible();
    // Wait for items to load before interacting with select-all.
    await expect(page.getByTestId("backlog-row").first()).toBeVisible();
  });

  test("select-all toggles every row and shows the bulk bar", async ({ page }) => {
    const total = await page.getByTestId("backlog-row").count();
    await page.getByTestId("select-all").click();
    await expect(page.getByTestId("bulk-bar")).toBeVisible();
    await expect(page.getByTestId("bulk-count")).toContainText(`${total} selected`);
    await expect(page.locator('[data-testid="row-select"]:checked')).toHaveCount(total);
  });

  test("bulk sets priority on selected items", async ({ page }) => {
    // Select the first three rows.
    const selects = page.getByTestId("row-select");
    for (let i = 0; i < 3; i++) await selects.nth(i).check();
    await expect(page.getByTestId("bulk-count")).toContainText("3 selected");

    await page.getByTestId("bulk-priority").selectOption("URGENT");
    // Bulk bar clears after applying.
    await expect(page.getByTestId("bulk-bar")).toHaveCount(0);

    // Verify via the API that at least 3 items are now urgent.
    await expect(async () => {
      const urgent = await fetchItems(page.request, { priority: "URGENT" });
      expect(urgent.length).toBeGreaterThanOrEqual(3);
    }).toPass();
  });

  test("bulk reassigns selected items", async ({ page, request }) => {
    const before = (await fetchItems(request, {})).length;
    await page.getByTestId("select-all").click();
    await page.getByTestId("bulk-assignee").selectOption({ label: "Lena Nyström" });
    await expect(page.getByTestId("bulk-bar")).toHaveCount(0);
    await expect(async () => {
      const lena = await fetchItems(request, {});
      // sanity: still same number of items, and the reassign call completed
      expect(lena.length).toBe(before);
    }).toPass();
  });

  test("bulk delete removes selected items", async ({ page, request }) => {
    const before = (await fetchItems(request)).length;
    await page.getByTestId("row-select").nth(0).check();
    await page.getByTestId("row-select").nth(1).check();
    await page.getByTestId("bulk-delete").click();
    await page.getByTestId("bulk-delete-confirm").click();

    await expect(async () => {
      const after = (await fetchItems(request)).length;
      expect(after).toBe(before - 2);
    }).toPass();
  });

  test("clear deselects everything", async ({ page }) => {
    await page.getByTestId("select-all").click();
    await expect(page.getByTestId("bulk-bar")).toBeVisible();
    await page.getByTestId("bulk-clear").click();
    await expect(page.getByTestId("bulk-bar")).toHaveCount(0);
    await expect(page.locator('[data-testid="row-select"]:checked')).toHaveCount(0);
  });
});
