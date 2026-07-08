import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

test.describe("Custom fields", () => {
  test("settings lists fields and can add one", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("fields-manager")).toBeVisible();
    await expect(page.getByTestId("field-row")).toHaveCount(2);

    await page.getByTestId("field-name").fill("Component");
    await page.getByTestId("field-type").selectOption("TEXT");
    await page.getByTestId("add-field").click();
    await expect(page.locator('[data-testid="field-row"][data-name="Component"]')).toBeVisible();
    await expect(page.getByTestId("field-row")).toHaveCount(3);
  });

  test("deletes a field", async ({ page }) => {
    await page.goto("/settings");
    await page.locator('[data-testid="field-row"][data-name="Team"]').getByTestId("field-delete").click();
    await expect(page.getByTestId("field-row")).toHaveCount(1);
  });

  test("drawer shows a seeded value and updates it", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-3");
    await expect(page.getByTestId("custom-fields")).toBeVisible();
    await expect(page.getByTestId("field-team")).toHaveValue("Frontend");

    const saved = page.waitForResponse((r) => /\/fields$/.test(r.url()) && r.request().method() === "PUT");
    await page.getByTestId("field-team").selectOption("Platform");
    await saved;

    await page.reload();
    await openCard(page, "SWISH-3");
    await expect(page.getByTestId("field-team")).toHaveValue("Platform");
  });

  test("groups the board by a custom select field", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.getByTestId("group-by").selectOption({ label: "Team" });
    // Seeded: SWISH-3 → Frontend, SWISH-12 → Platform.
    await expect(page.locator('[data-testid="swimlane"][data-lane="Frontend"] [data-key="SWISH-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="swimlane"][data-lane="Platform"] [data-key="SWISH-12"]')).toBeVisible();
  });

  test("sets a URL field on an item without a value", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-16");
    const input = page.getByTestId("field-design-doc");
    const saved = page.waitForResponse((r) => /\/fields$/.test(r.url()) && r.request().method() === "PUT");
    await input.fill("https://x.dev/spec");
    await input.blur();
    await saved;

    await page.reload();
    await openCard(page, "SWISH-16");
    await expect(page.getByTestId("field-design-doc")).toHaveValue("https://x.dev/spec");
  });
});
