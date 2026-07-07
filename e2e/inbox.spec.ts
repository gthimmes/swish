import { test, expect } from "./fixtures";

test.describe("Inbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByTestId("inbox-assigned")).toBeVisible();
  });

  test("shows open items assigned to the current user + a nav badge", async ({ page }) => {
    // Glenn is assigned SWISH-22 (Auth, in Spec — not Done).
    await expect(page.locator('[data-testid="inbox-item"][data-key="SWISH-22"]')).toBeVisible();
    await expect(page.getByTestId("nav-inbox").getByTestId("inbox-badge")).toBeVisible();
  });

  test("shows a mention of the current user", async ({ page }) => {
    const mention = page.getByTestId("inbox-mention").first();
    await expect(mention).toBeVisible();
    await expect(mention.getByTestId("mention")).toContainText("@Glenn");
  });

  test("clicking an assigned item opens its drawer", async ({ page }) => {
    await page.locator('[data-testid="inbox-item"][data-key="SWISH-22"]').click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByTestId("drawer-key")).toHaveText("SWISH-22");
  });

  test("clicking a mention opens the mentioned item", async ({ page }) => {
    await page.getByTestId("inbox-mention").first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByTestId("drawer-key")).toHaveText("SWISH-13");
  });
});
