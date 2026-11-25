import { expect, test } from "@playwright/test";

test("[K01] strona główna pokazuje crux", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("crux")).toBeVisible();
});
