import { test, expect } from "./fixtures";
import { fetchItems } from "./helpers";

test.describe("Roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/roadmap");
    await expect(page.getByTestId("roadmap-epic").first()).toBeVisible();
  });

  test("renders one section per epic", async ({ page, request }) => {
    const epics = (await fetchItems(request)).filter((i) => i.type === "EPIC");
    expect(epics.length).toBeGreaterThan(0);
    await expect(page.getByTestId("roadmap-epic")).toHaveCount(epics.length);
  });

  test("summary reflects epic count", async ({ page, request }) => {
    const epics = (await fetchItems(request)).filter((i) => i.type === "EPIC").length;
    await expect(page.getByTestId("roadmap-summary")).toContainText(`${epics} epics`);
  });

  test("a fully delivered epic shows 100%", async ({ page }) => {
    // SWISH-1 "Configurable board & swimlanes" — all children are Done.
    const epic = page.locator('[data-testid="roadmap-epic"][data-key="SWISH-1"]');
    await expect(epic).toContainText("100%");
  });

  test("clicking a story opens the drawer", async ({ page }) => {
    await page.getByTestId("roadmap-story").first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
  });

  test("an epic can be collapsed", async ({ page }) => {
    const epic = page.locator('[data-testid="roadmap-epic"][data-key="SWISH-1"]');
    await expect(epic.getByTestId("roadmap-story").first()).toBeVisible();
    await epic.getByRole("button", { name: "Collapse" }).click();
    await expect(epic.getByTestId("roadmap-story")).toHaveCount(0);
  });
});
