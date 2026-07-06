import { test, expect } from "./fixtures";
import { dragCardTo } from "./helpers";

test.describe("Drag and drop", () => {
  test("moves a card to another stage and persists", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();

    // SWISH-5 "Inline-edit workflow stages" starts in "Ready" (seed). Move it to
    // the adjacent "Spec" column (both on-screen).
    const moving = page.locator('[data-key="SWISH-5"]');
    const target = page.locator('[data-stage="Spec"]');

    await expect(moving).toBeVisible();
    await expect(page.locator('[data-stage="Spec"] [data-key="SWISH-5"]')).toHaveCount(0);

    await dragCardTo(page, moving, target);

    await expect(page.locator('[data-stage="Spec"] [data-key="SWISH-5"]')).toBeVisible();

    // Persists across reload.
    await page.reload();
    await expect(page.getByTestId("board")).toBeVisible();
    await expect(page.locator('[data-stage="Spec"] [data-key="SWISH-5"]')).toBeVisible();
  });

  test("moving a card updates its stage in the detail drawer", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();

    const moving = page.locator('[data-key="SWISH-11"]'); // Ready
    const target = page.locator('[data-stage="Spec"]');
    await dragCardTo(page, moving, target);
    await expect(page.locator('[data-stage="Spec"] [data-key="SWISH-11"]')).toBeVisible();

    await page.locator('[data-key="SWISH-11"]').first().click();
    await expect(page.getByTestId("item-drawer")).toBeVisible();
    await expect(page.getByTestId("drawer-stage")).toHaveValue(/.+/);
    // The stage select should read "Spec".
    const label = await page.getByTestId("drawer-stage").locator("option:checked").textContent();
    expect(label).toBe("Spec");
  });
});
