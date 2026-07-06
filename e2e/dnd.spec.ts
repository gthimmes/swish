import { test, expect } from "./fixtures";
import { dragCardTo } from "./helpers";

test.describe("Drag and drop", () => {
  test("moves a card to another stage and persists", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();

    // Grab whatever card is at the top of the Backlog column and move it to the
    // adjacent Spec column (both on-screen, left side).
    const card = page.locator('[data-stage="Backlog"] [data-testid="board-card"]').first();
    await expect(card).toBeVisible();
    const key = await card.getAttribute("data-key");
    expect(key).toBeTruthy();

    await expect(page.locator(`[data-stage="Spec"] [data-key="${key}"]`)).toHaveCount(0);
    await dragCardTo(page, card, page.locator('[data-stage="Spec"]'));
    await expect(page.locator(`[data-stage="Spec"] [data-key="${key}"]`)).toBeVisible();

    // Persists across reload.
    await page.reload();
    await expect(page.getByTestId("board")).toBeVisible();
    await expect(page.locator(`[data-stage="Spec"] [data-key="${key}"]`)).toBeVisible();
  });

  test("moving a card updates its stage in the detail drawer", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();

    const card = page.locator('[data-stage="Backlog"] [data-testid="board-card"]').first();
    const key = await card.getAttribute("data-key");
    await dragCardTo(page, card, page.locator('[data-stage="Spec"]'));
    await expect(page.locator(`[data-stage="Spec"] [data-key="${key}"]`)).toBeVisible();

    await page.locator(`[data-key="${key}"]`).first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    const label = await page.getByTestId("drawer-stage").locator("option:checked").textContent();
    expect(label).toBe("Spec");
  });
});
