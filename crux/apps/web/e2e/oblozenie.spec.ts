import { expect, test } from "@playwright/test";

/**
 * [F0-010] Obłożenie — ścieżka szczęśliwa. Wymaga seedu (E2E_EMAIL / E2E_PASSWORD / E2E_TOTP_CODE)
 * i lokalnego Supabase z gabinetem, fotelami i godzinami otwarcia.
 */
const email = process.env["E2E_EMAIL"];
const password = process.env["E2E_PASSWORD"];
const totp = process.env["E2E_TOTP_CODE"];

test.describe("[F0-010] obłożenie", () => {
  test.skip(!email || !password || !totp, "Ustaw E2E_EMAIL, E2E_PASSWORD i E2E_TOTP_CODE");

  test("[F0-010/AC9] siatka dnia i zapis wpisu z klawiatury", async ({ page }) => {
    if (!email || !password || !totp) return;
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło").fill(password);
    await page.getByRole("button", { name: "Zaloguj" }).click();
    await page.waitForURL(/\/logowanie\/mfa/);
    await page.getByLabel("Kod").fill(totp);
    await page.getByRole("button", { name: "Potwierdź" }).click();
    await page.waitForURL(/\/oblozenie/);

    const grid = page.getByRole("grid");
    await expect(grid).toBeVisible();

    // Przyszły dzień roboczy bez zamknięcia: wybierz dzień z wpisu URL.
    await page.goto("/oblozenie?dzien=2030-01-08");
    const cell = page.getByTestId("cell-0-10");
    await cell.focus();
    await page.keyboard.press("3"); // Z3
    await expect(page.getByTestId("occupancy-status")).toHaveText("Zapisano.");
    await expect(cell).toContainText("Z3");

    // Enter → edytor, Escape → anulowanie.
    await cell.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Wpis obłożenia" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Wpis obłożenia" })).toBeHidden();
  });
});
