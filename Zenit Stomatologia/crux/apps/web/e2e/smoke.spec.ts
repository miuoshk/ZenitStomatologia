import { expect, test } from "@playwright/test";

test("[K07] niezalogowany trafia na logowanie", async ({ page }) => {
  await page.goto("/oblozenie");
  await expect(page).toHaveURL(/\/logowanie/);
  await expect(page.getByRole("heading", { name: "Logowanie" })).toBeVisible();
  await expect(page.getByAltText("Crux")).toBeVisible();
});

test("[K07] strona logowania ma formularz e-mail i hasło", async ({ page }) => {
  await page.goto("/logowanie");
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Hasło")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zaloguj" })).toBeVisible();
});

test("[K07] /zablokowany bez sesji wraca do logowania", async ({ page }) => {
  await page.goto("/zablokowany");
  await expect(page).toHaveURL(/\/logowanie/);
});
