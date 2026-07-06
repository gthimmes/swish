import { test, expect } from "./fixtures";
import { fetchItems } from "./helpers";

test.describe("Specs overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/specs");
  });

  test("lists every item that has a spec", async ({ page, request }) => {
    const withSpec = (await fetchItems(request)).filter((i) => i.spec);
    expect(withSpec.length).toBeGreaterThan(0);
    await expect(page.getByTestId("spec-card")).toHaveCount(withSpec.length);
  });

  test("filters specs by status", async ({ page, request }) => {
    const items = await fetchItems(request);
    const withSpec = items.filter((i) => i.spec);
    const approved = withSpec.filter((i) => i.spec!.status === "APPROVED");
    expect(approved.length).toBeGreaterThan(0);

    const cards = page.getByTestId("spec-card");
    await expect(cards).toHaveCount(withSpec.length); // wait for load
    await page.getByTestId("spec-status-filter").getByRole("button", { name: /Approved/ }).click();
    await expect(cards).toHaveCount(approved.length);
    await expect(cards.filter({ hasText: "Approved" })).toHaveCount(approved.length);
  });

  test("opens the drawer from a spec card", async ({ page }) => {
    await page.getByTestId("spec-card").first().click();
    await expect(page.getByTestId("item-drawer")).toHaveAttribute("aria-hidden", "false");
    await expect(page.getByTestId("spec-editor")).toBeVisible();
  });
});
