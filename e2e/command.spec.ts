import { test, expect } from "./fixtures";

test.describe("Command palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
  });

  test("opens with Ctrl+K and closes with Escape", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page.getByTestId("command-input")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
  });

  test("navigates to a view", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-input").fill("insights");
    await page.getByTestId("command-item").first().click();
    await expect(page.getByTestId("stat-tiles")).toBeVisible();
    await expect(page).toHaveURL(/\/insights/);
  });

  test("navigates with the keyboard (Enter on top result)", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-input").fill("roadmap");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("roadmap-epic").first()).toBeVisible();
  });

  test("opens a work item in the drawer", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-input").fill("Drag-and-drop cards");
    await page.getByTestId("command-item").first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByTestId("drawer-key")).toHaveText("SWISH-3");
  });

  test("runs the create-item action", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-input").fill("create");
    await page.getByTestId("command-item").first().click();
    await expect(page.getByTestId("new-item-title")).toBeVisible();
  });
});
