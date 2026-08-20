import { test, expect } from "./fixtures";

// The in-app help center (help-navigator widget mounted in the (app) layout).
// Playwright locators pierce the widget's shadow root automatically.

test.describe("Help center", () => {
  test("launcher opens contextual help; context follows the route", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();

    await page.getByRole("button", { name: "Open help" }).click();
    const panel = page.getByRole("dialog", { name: "Swish Help" });
    await expect(panel.getByText("Suggested for this page")).toBeVisible();
    await expect(panel.getByText("The board: stages, cards, and drag-and-drop")).toBeVisible();
    await expect(panel.getByText("Browse by topic")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(panel.getByText("Browse by topic")).not.toBeVisible();

    await page.getByTestId("nav-timeline").click();
    await page.waitForURL(/\/timeline/);
    await page.keyboard.press("F1");
    await expect(panel.getByText("The timeline: a mini-Gantt")).toBeVisible();
  });

  test("search, article rendering, feedback, and back navigation", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.keyboard.press("F1");
    const panel = page.getByRole("dialog", { name: "Swish Help" });

    await panel.getByPlaceholder("Search help articles…").fill("swimlane");
    await expect(panel.locator("mark").first()).toBeVisible();
    await panel
      .locator("button.hn-item", { hasText: "Swimlanes: group the board by any dimension" })
      .click();
    await expect(
      panel.getByRole("heading", { name: "Swimlanes: group the board by any dimension" }),
    ).toBeVisible();
    await expect(panel.getByText("Drag across lanes")).toBeVisible();

    await panel.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(panel.getByText("Thanks for the feedback!")).toBeVisible();

    await panel.getByRole("button", { name: "Back", exact: true }).click();
    await expect(panel.locator("mark").first()).toBeVisible(); // back on search results
  });

  test("typing in help search does not trigger app shortcuts", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.keyboard.press("F1");
    const panel = page.getByRole("dialog", { name: "Swish Help" });

    // "cycles" contains "c" — the app's new-item shortcut. Typed into the
    // shadow-DOM search box it must not open the new-item modal.
    await panel.getByPlaceholder("Search help articles…").pressSequentially("cycles");
    await expect(panel.getByText("Cycles (sprints, if you want them)")).toBeVisible();
    await expect(page.getByTestId("new-item-title")).toHaveCount(0);
  });

  test("category browsing drills into board help", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByTestId("board")).toBeVisible();
    await page.keyboard.press("F1");
    const panel = page.getByRole("dialog", { name: "Swish Help" });

    await panel.locator("button.hn-item", { hasText: "Board & views" }).click();
    await expect(
      panel.getByText("Stage columns, swimlanes, drag-and-drop, and saved views."),
    ).toBeVisible();
    await panel.locator("button.hn-item", { hasText: "Saved views" }).click();
    await expect(panel.getByText("Using them")).toBeVisible();
    await expect(panel.locator(".hn-article").getByText(/grouping \+ filter/)).toBeVisible();

    await panel.getByRole("button", { name: "Back", exact: true }).click();
    await panel.getByRole("button", { name: "Back", exact: true }).click();
    await expect(panel.getByText("Browse by topic")).toBeVisible();
  });
});
