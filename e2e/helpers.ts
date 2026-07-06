import { Page, Locator, expect } from "@playwright/test";

/**
 * Drag a card onto a target element using small pointer steps so @dnd-kit's
 * distance-based PointerSensor activates.
 */
export async function dragCardTo(page: Page, card: Locator, target: Locator) {
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) throw new Error("missing bounding box for drag");

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + Math.min(targetBox.height / 2, 60);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Wiggle to pass the activation threshold.
  await page.mouse.move(startX + 8, startY + 8, { steps: 5 });
  await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 10 });
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.move(endX, endY + 2, { steps: 3 });
  await page.mouse.up();
}

/**
 * Open the detail drawer for a card. Robust to a drawer that is already open
 * (e.g. after a reload that preserved the ?item= deep link).
 */
export async function openCard(page: Page, key: string) {
  const drawer = page.getByTestId("item-drawer");
  const isOpen = (await drawer.getAttribute("aria-hidden")) === "false";
  if (isOpen) {
    const current = await page.getByTestId("drawer-key").textContent().catch(() => null);
    if (current === key) return;
    await page.getByTestId("drawer-close").click();
    await expect(drawer).toHaveAttribute("aria-hidden", "true");
  }
  await page.locator(`[data-key="${key}"]`).first().click();
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
}
