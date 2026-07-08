import { test, expect } from "./fixtures";

test.describe("Keyboard & accessibility", () => {
  test("board cards are focusable with accessible names", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    const card = page.getByTestId("board-card").first();
    await expect(card).toHaveAttribute("aria-label", /SWISH-\d+:/);
    await card.focus();
    await expect(card).toBeFocused();
  });

  test("Enter opens the focused card", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    const card = page.locator('[data-key="SWISH-1"]').first();
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
  });

  test("keyboard drag reorders a card within its column", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    const first = page.locator('[data-stage="Backlog"] [data-testid="board-card"]').first();
    const key = await first.getAttribute("data-key");

    await first.focus();
    await page.keyboard.press("Space"); // pick up
    await page.waitForTimeout(150);
    await page.keyboard.press("ArrowDown"); // move down within the column
    await page.waitForTimeout(150);
    await page.keyboard.press("Space"); // drop
    await page.waitForTimeout(200);

    // The picked-up card is no longer first in its column.
    await expect(page.locator('[data-stage="Backlog"] [data-testid="board-card"]').first()).not.toHaveAttribute(
      "data-key",
      key!
    );
    // …and it persists after reload (rank saved).
    await page.reload();
    await expect(page.getByTestId("board")).toBeVisible();
    await expect(page.locator('[data-stage="Backlog"] [data-testid="board-card"]').first()).not.toHaveAttribute(
      "data-key",
      key!
    );
  });

  test("active nav link is marked aria-current", async ({ page }) => {
    await page.goto("/backlog");
    await expect(page.getByTestId("backlog-table")).toBeVisible();
    await expect(page.getByTestId("nav-backlog")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("nav-board")).not.toHaveAttribute("aria-current", "page");
  });

  test("the item drawer is a modal dialog", async ({ page }) => {
    await page.goto("/board");
    await page.locator('[data-key="SWISH-1"]').first().click();
    const drawer = page.getByTestId("item-drawer");
    await expect(drawer).toHaveAttribute("role", "dialog");
    await expect(drawer).toHaveAttribute("aria-modal", "true");
  });
});
