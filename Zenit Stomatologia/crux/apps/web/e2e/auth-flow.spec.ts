import { expect, test } from "@playwright/test";

/**
 * Pełny tor logowanie → MFA → powłoka wymaga seedu (E2E_EMAIL / E2E_PASSWORD / TOTP).
 * Bez credentials testy są pomijane — UI smoke pokrywa K07 bez Auth.
 */
const email = process.env["E2E_EMAIL"];
const password = process.env["E2E_PASSWORD"];
const totp = process.env["E2E_TOTP_CODE"];

test.describe("auth flow", () => {
  test.skip(!email || !password, "Ustaw E2E_EMAIL i E2E_PASSWORD");

  test("[K07] logowanie prowadzi do MFA lub powłoki", async ({ page }) => {
    if (!email || !password) return;
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło").fill(password);
    await page.getByRole("button", { name: "Zaloguj" }).click();
    await expect(page).toHaveURL(/\/logowanie\/(mfa|haslo)|\/oblozenie/);
  });

  test("[K07] MFA z kodem otwiera powłokę", async ({ page }) => {
    test.skip(!totp, "Ustaw E2E_TOTP_CODE");
    if (!email || !password || !totp) return;
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło").fill(password);
    await page.getByRole("button", { name: "Zaloguj" }).click();
    await page.waitForURL(/\/logowanie\/mfa/);
    await page.getByLabel("Kod").fill(totp);
    await page.getByRole("button", { name: "Potwierdź" }).click();
    await expect(page).toHaveURL(/\/oblozenie/);
    await expect(page.getByRole("link", { name: "Obłożenie" })).toBeVisible();
  });
});
