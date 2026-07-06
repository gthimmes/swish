import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

test.describe("Item detail & spec editor", () => {
  test("opens a card and shows its spec", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-3"); // "Drag-and-drop cards..." has an APPROVED spec
    await expect(page.getByTestId("drawer-key")).toHaveText("SWISH-3");
    await expect(page.getByTestId("spec-editor")).toBeVisible();
    await expect(page.getByTestId("spec-status")).toHaveValue("APPROVED");
    // Seeded criteria present.
    await expect(page.getByTestId("criterion")).not.toHaveCount(0);
  });

  test("edits a spec section and persists after reload", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-3");

    const marker = "APPROACH EDITED BY PLAYWRIGHT";
    const approach = page.getByTestId("spec-approach");
    await approach.fill(marker);
    // Wait for debounced save.
    await expect(page.getByTestId("save-indicator")).toHaveText("Saved");
    await page.waitForTimeout(700);

    await page.reload();
    await openCard(page, "SWISH-3");
    await expect(page.getByTestId("spec-approach")).toHaveValue(marker);
  });

  test("toggles an acceptance criterion and updates progress", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-7"); // "Structured spec editor" — has criteria

    const firstToggle = page.getByTestId("criterion-toggle").first();
    const wasChecked = await firstToggle.isChecked();
    const saved = page.waitForResponse(
      (r) => /\/api\/criteria\//.test(r.url()) && r.request().method() === "PATCH"
    );
    await firstToggle.click();
    await saved;
    await expect(firstToggle).toBeChecked({ checked: !wasChecked });

    // Persists.
    await page.reload();
    await openCard(page, "SWISH-7");
    await expect(page.getByTestId("criterion-toggle").first()).toBeChecked({ checked: !wasChecked });
  });

  test("adds a new acceptance criterion", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-7");

    const before = await page.getByTestId("criterion").count();
    await page.getByTestId("criterion-input").fill("Given a fresh criterion, it appears in the list");
    await page.getByTestId("criterion-add").click();
    await expect(page.getByTestId("criterion")).toHaveCount(before + 1);
    await expect(page.getByText("Given a fresh criterion, it appears in the list")).toBeVisible();
  });

  test("changes spec status", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-9"); // "Test plan per item" — DRAFT
    await expect(page.getByTestId("spec-status")).toHaveValue("DRAFT");
    const saved = page.waitForResponse(
      (r) => /\/spec$/.test(r.url()) && r.request().method() === "PUT"
    );
    await page.getByTestId("spec-status").selectOption("IN_REVIEW");
    await saved;

    await page.reload();
    await openCard(page, "SWISH-9");
    await expect(page.getByTestId("spec-status")).toHaveValue("IN_REVIEW");
  });

  test("cycles a test plan item status", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-3");
    const status = page.getByTestId("test-status").first();
    const before = await status.textContent();
    await status.click();
    await expect(status).not.toHaveText(before ?? "");
  });

  test("edits item metadata (assignee) from the drawer", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-14"); // "Dark mode..." Lena
    await page.getByTestId("drawer-assignee").selectOption({ label: "Dax Okonkwo" });
    await page.reload();
    await openCard(page, "SWISH-14");
    const label = await page.getByTestId("drawer-assignee").locator("option:checked").textContent();
    expect(label).toBe("Dax Okonkwo");
  });
});
