import { expect, test, type Page } from "@playwright/test";

/**
 * [F0-K15] Administracja. Wymaga seedu (E2E_EMAIL / E2E_PASSWORD / E2E_TOTP_CODE) z kontem
 * administratora sieci (org.manage, staff.manage, settings.manage, integrations.manage).
 *
 * Luka: wymuszona zmiana hasła po zaproszeniu (must_change_password) jest egzekwowana przez
 * `requireActor` → /logowanie/haslo, ale pełny przepływ „zaproś → zaloguj nowym hasłem” wymaga
 * SUPABASE_SECRET_KEY i skrzynki/hasła jednorazowego, więc nie jest pokryty tym testem.
 */
const email = process.env["E2E_EMAIL"];
const password = process.env["E2E_PASSWORD"];
const totp = process.env["E2E_TOTP_CODE"];

async function login(page: Page, e: string, p: string, t: string) {
  await page.goto("/logowanie");
  await page.getByLabel("E-mail").fill(e);
  await page.getByLabel("Hasło").fill(p);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await page.waitForURL(/\/logowanie\/mfa/);
  await page.getByLabel("Kod").fill(t);
  await page.getByRole("button", { name: "Potwierdź" }).click();
  await page.waitForURL(/\/oblozenie/);
}

test.describe("[F0-K15] ustawienia", () => {
  test.skip(!email || !password || !totp, "Ustaw E2E_EMAIL, E2E_PASSWORD i E2E_TOTP_CODE");

  test.beforeEach(async ({ page }) => {
    if (!email || !password || !totp) return;
    await login(page, email, password, totp);
  });

  test("hub pokazuje sekcje zgodne z uprawnieniami", async ({ page }) => {
    await page.goto("/ustawienia");
    await expect(page.getByRole("heading", { name: "Ustawienia" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Profil/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /O Crux/ })).toBeVisible();
  });

  test("organizacja: lista gabinetów i dodanie fotela (Ctrl+Enter)", async ({ page }) => {
    await page.goto("/ustawienia/organizacja");
    const denied = page.getByText("Brak uprawnień do tej sekcji.");
    if (await denied.isVisible()) test.skip(true, "Konto e2e bez org.manage");
    await expect(page.getByTestId("locations-list")).toBeVisible();
    const name = `E2E ${String(Date.now()).slice(-6)}`;
    const form = page.getByTestId("chair-add-form");
    await form.getByLabel("Nazwa fotela").fill(name);
    await form.getByLabel("Nazwa fotela").press("Control+Enter");
    await expect(form.getByRole("status")).toHaveText("Zapisano.");
    await expect(page.getByTestId("chairs-list")).toContainText(name);
  });

  test("organizacja: błąd zapisu zostawia wartości w formularzu", async ({ page }) => {
    await page.goto("/ustawienia/organizacja");
    const denied = page.getByText("Brak uprawnień do tej sekcji.");
    if (await denied.isVisible()) test.skip(true, "Konto e2e bez org.manage");
    const form = page.getByTestId("location-new-form");
    await form.getByLabel("Numer (dwie cyfry)").fill("x");
    await form.getByLabel("Nazwa").fill("Zachowaj mnie");
    await form.getByRole("button", { name: "Dodaj gabinet" }).click();
    await expect(form.getByRole("alert").first()).toBeVisible();
    await expect(form.getByLabel("Nazwa")).toHaveValue("Zachowaj mnie");
  });

  test("integracje: stan workera i kolejka", async ({ page }) => {
    await page.goto("/integracje");
    const denied = page.getByText("Brak uprawnień do tej sekcji.");
    if (await denied.isVisible()) test.skip(true, "Konto e2e bez integrations.manage");
    await expect(page.getByTestId("worker-health")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Integracje" })).toBeVisible();
  });

  test("profil: przełączenie motywu ustawia cookie crux.theme", async ({ page }) => {
    await page.goto("/ustawienia/profil");
    await page.getByRole("radio", { name: "Ciemny" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "crux.theme")?.value).toBe("dark");
  });
});

test.describe("[F0-K15] odmowa uprawnień", () => {
  const lowEmail = process.env["E2E_LOW_EMAIL"];
  const lowPassword = process.env["E2E_LOW_PASSWORD"];
  const lowTotp = process.env["E2E_LOW_TOTP_CODE"];
  test.skip(!lowEmail || !lowPassword || !lowTotp, "Ustaw E2E_LOW_EMAIL / _PASSWORD / _TOTP_CODE (konto bez uprawnień admin)");

  test("konto bez uprawnień widzi komunikat zamiast formularzy", async ({ page }) => {
    if (!lowEmail || !lowPassword || !lowTotp) return;
    await login(page, lowEmail, lowPassword, lowTotp);
    await page.goto("/ustawienia/organizacja");
    await expect(page.getByText("Brak uprawnień do tej sekcji.")).toBeVisible();
    await page.goto("/integracje");
    await expect(page.getByText("Brak uprawnień do tej sekcji.")).toBeVisible();
  });
});
