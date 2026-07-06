import { test, expect } from "./fixtures";

test.describe("Specs overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/specs");
  });

  test("lists every item that has a spec", async ({ page }) => {
    // 8 seeded items carry specs.
    await expect(page.getByTestId("spec-card")).toHaveCount(8);
  });

  test("filters specs by status", async ({ page }) => {
    const cards = page.getByTestId("spec-card");
    await expect(cards).toHaveCount(8); // wait for the list to load
    await page.getByTestId("spec-status-filter").getByRole("button", { name: /Approved/ }).click();
    // 3 seeded specs are Approved.
    await expect(cards).toHaveCount(3);
    await expect(cards.filter({ hasText: "Approved" })).toHaveCount(3);
  });

  test("opens the drawer from a spec card", async ({ page }) => {
    await page.getByTestId("spec-card").first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByTestId("spec-editor")).toBeVisible();
  });
});
