import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

test.describe("Agent hand-off (AI-ready brief)", () => {
  test("generates a brief from the item's spec", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-3"); // has an approved spec + criteria + tests
    await page.getByTestId("agent-brief-open").click();

    const brief = page.getByTestId("agent-brief");
    await expect(brief).toBeVisible();
    await expect(brief).toContainText("# SWISH-3:");
    await expect(brief).toContainText("Problem & Context");
    await expect(brief).toContainText("Acceptance Criteria");
    await expect(brief).toContainText("Test Plan");
    await expect(brief).toContainText("- [x]"); // a completed criterion
  });

  test("copy confirms", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-3");
    await page.getByTestId("agent-brief-open").click();
    await page.getByTestId("agent-brief-copy").click();
    await expect(page.getByTestId("agent-brief-copy")).toHaveText("Copied!");
  });

  test("available for items without a spec too", async ({ page }) => {
    await page.goto("/board");
    await openCard(page, "SWISH-6"); // WIP limits task — no spec
    await page.getByTestId("agent-brief-open").click();
    await expect(page.getByTestId("agent-brief")).toContainText("# SWISH-6:");
    await expect(page.getByTestId("agent-brief")).toContainText("No structured spec yet");
  });
});
