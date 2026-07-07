import { test, expect } from "./fixtures";
import { openCard } from "./helpers";

async function openActivity(page: import("@playwright/test").Page) {
  await page.goto("/board");
  await openCard(page, "SWISH-3");
  await page.getByTestId("tab-activity").click();
  await expect(page.getByTestId("activity-feed")).toBeVisible();
}

test.describe("Comments & @mentions", () => {
  test("shows the seeded thread with a highlighted mention and a reply", async ({ page }) => {
    await openActivity(page);
    await expect(page.getByTestId("mention").first()).toBeVisible();
    await expect(page.getByTestId("mention").first()).toContainText("@Dax");
    await expect(page.getByTestId("replies")).toBeVisible();
  });

  test("mention autocomplete inserts a handle", async ({ page }) => {
    await openActivity(page);
    const input = page.getByTestId("comment-input");
    await input.fill("Nice work @Le");
    await expect(page.getByTestId("comment-mentions")).toBeVisible();
    await page.getByTestId("comment-mentions").getByTestId("mention-option").first().click();
    await expect(input).toHaveValue(/@Lena\s$/);
  });

  test("adds a comment with a mention", async ({ page }) => {
    await openActivity(page);
    const input = page.getByTestId("comment-input");
    await input.fill("Shipping this @Le");
    await page.getByTestId("comment-mentions").getByTestId("mention-option").first().click();
    await page.getByTestId("comment-send").click();

    const comment = page.getByTestId("activity-comment").filter({ hasText: "Shipping this" });
    await expect(comment).toBeVisible();
    await expect(comment.getByTestId("mention")).toContainText("@Lena");
  });

  test("replies to a comment (threading)", async ({ page }) => {
    await openActivity(page);
    await page.getByTestId("reply-button").first().click();
    const reply = page.getByTestId("reply-input");
    await reply.fill("Confirmed, arrow-key test added.");
    await page.getByTestId("reply-send").click();

    await expect(
      page.getByTestId("replies").getByText("Confirmed, arrow-key test added.")
    ).toBeVisible();
  });
});
