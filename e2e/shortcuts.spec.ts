import { test, expect } from "./fixtures";

test.describe("Keyboard shortcuts", () => {
  test("'c' opens the new-item modal", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.locator("body").press("c");
    await expect(page.getByTestId("new-item-title")).toBeVisible();
  });

  test("'/' focuses the search field", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.locator("body").press("/");
    await expect(page.getByTestId("filter-search")).toBeFocused();
  });

  test("'g' then 'l' navigates to the backlog", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.locator("body").press("g");
    await page.locator("body").press("l");
    await expect(page.getByTestId("backlog-table")).toBeVisible();
  });
});
