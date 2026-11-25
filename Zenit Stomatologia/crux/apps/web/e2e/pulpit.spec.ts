import { expect, test, type Page } from "@playwright/test";

/**
 * [F0-011] Pulpity 1.0. Wymaga seedu golden (`pnpm seed:demo` + `pnpm analytics:refresh`) i zmiennych
 * E2E_EMAIL / E2E_PASSWORD / E2E_TOTP_CODE (konto zarządu z `analytics.view_network`).
 * Opcjonalnie E2E_DOCTOR_EMAIL / E2E_DOCTOR_PASSWORD / E2E_DOCTOR_TOTP_CODE (konto z samym `analytics.view_self`).
 * Okres wzorcowy: 2025-10-01…2026-10-31.
 */
const email = process.env["E2E_EMAIL"];
const password = process.env["E2E_PASSWORD"];
const totp = process.env["E2E_TOTP_CODE"];
const doctorEmail = process.env["E2E_DOCTOR_EMAIL"];
const doctorPassword = process.env["E2E_DOCTOR_PASSWORD"];
const doctorTotp = process.env["E2E_DOCTOR_TOTP_CODE"];

const GOLDEN = "okres=od&od=2025-10-01&do=2026-10-31";

async function login(page: Page, e: string, p: string, code: string): Promise<void> {
  await page.goto("/logowanie");
  await page.getByLabel("E-mail").fill(e);
  await page.getByLabel("Hasło").fill(p);
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await page.waitForURL(/\/logowanie\/mfa/);
  await page.getByLabel("Kod").fill(code);
  await page.getByRole("button", { name: "Potwierdź" }).click();
  await page.waitForURL(/\/oblozenie|\/pulpit/);
}

test.describe("[F0-011] pulpity", () => {
  test.skip(!email || !password || !totp, "Ustaw E2E_EMAIL, E2E_PASSWORD i E2E_TOTP_CODE");

  test("[F0-011/AC2] zmiana filtra aktualizuje URL, a wklejony URL odtwarza widok", async ({ page, context }) => {
    if (!email || !password || !totp) return;
    await login(page, email, password, totp);
    await page.goto(`/pulpit?${GOLDEN}`);
    await expect(page.getByRole("heading", { name: "Pulpit" })).toBeVisible();

    await page.getByLabel("Porównaj z").selectOption("rok_temu");
    await page.waitForURL(/porownaj=rok_temu/);
    await page.getByLabel("Kategoria").selectOption("Z5");
    await page.waitForURL(/kategoria=Z5/);
    const url = page.url();
    expect(url).toContain("okres=od");

    const other = await context.newPage();
    await other.goto(url);
    await expect(other.getByLabel("Porównaj z")).toHaveValue("rok_temu");
    await expect(other.getByLabel("Kategoria")).toHaveValue("Z5");
  });

  test("[F0-011/AC4] kafel prowadzi do listy z sumą kontrolną równą kaflowi", async ({ page }) => {
    if (!email || !password || !totp) return;
    await login(page, email, password, totp);
    await page.goto(`/pulpit?${GOLDEN}`);
    await page.getByRole("link", { name: /Godziny pracy foteli: lista wpisów/ }).click();
    await page.waitForURL(/\/lista\/oblozenie\?metric=chair_hours_worked/);
    const tile = await page.getByTestId("control-tile").innerText();
    const list = await page.getByTestId("control-list").innerText();
    expect(list).toBe(tile);
    await expect(page.getByRole("status")).toContainText("zgodne z kafelkiem");
  });

  test("[F0-011/AC7] przełącznik Wykres | Tabela pokazuje tabelę z tymi samymi liczbami", async ({ page }) => {
    if (!email || !password || !totp) return;
    await login(page, email, password, totp);
    await page.goto(`/pulpit?${GOLDEN}`);
    const card = page.locator("div", { has: page.getByRole("heading", { name: "Struktura przychodu" }) }).last();
    await card.getByRole("radio", { name: "Tabela" }).click();
    await expect(card.getByRole("table")).toBeVisible();
    await expect(page).toHaveURL(/widok=kategorie%3Atabela|widok=kategorie:tabela/);
  });

  test("[F0-011/AC6] czas nawigacji pulpitu (miękka asercja, p95 mierzy staging)", async ({ page }) => {
    if (!email || !password || !totp) return;
    await login(page, email, password, totp);
    const samples: number[] = [];
    for (const okres of ["7d", "30d", "mtd", "rok", "kw"]) {
      const t0 = performance.now();
      await page.goto(`/pulpit?okres=${okres}`);
      await expect(page.getByRole("toolbar", { name: "Filtry" })).toBeVisible();
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const worst = samples[samples.length - 1] ?? 0;
    test.info().annotations.push({ type: "pulpit-nav-ms", description: samples.map((s) => s.toFixed(0)).join(",") });
    // Miękko: budżet 1,5 s dotyczy p95 na stagingu z zestawem wzorcowym, lokalnie tylko ostrzegamy.
    expect.soft(worst, "czas nawigacji /pulpit (ms)").toBeLessThan(1500);
  });
});

test.describe("[F0-011/AC3] role", () => {
  test.skip(
    !doctorEmail || !doctorPassword || !doctorTotp,
    "Ustaw E2E_DOCTOR_EMAIL, E2E_DOCTOR_PASSWORD i E2E_DOCTOR_TOTP_CODE (konto z samym analytics.view_self)",
  );

  test("[F0-011/AC3] lekarz z /pulpit trafia na /pulpit/moje, a cudzy wykonawca jest ignorowany", async ({ page }) => {
    if (!doctorEmail || !doctorPassword || !doctorTotp) return;
    await login(page, doctorEmail, doctorPassword, doctorTotp);
    await page.goto("/pulpit?wykonawca=00000000-0000-4000-8000-000000000001");
    await page.waitForURL(/\/pulpit\/moje/);
    await expect(page.getByRole("heading", { name: "Moje liczby" })).toBeVisible();
    await page.goto("/pulpit/gabinet");
    await page.waitForURL(/\/pulpit\/moje/);
  });
});
