import { expect, test, type Page } from "@playwright/test";

// Camila (ejecutiva, sin TOTP) sobre el seed ficticio recién reseteado por
// scripts/tekfusion/e2e.mjs: el seed le deja alertas sin leer.
const EMAIL = "camila.rojas@tekfusion-demo.cl";
const PASSWORD = "demo-tekfusion";
const UNREAD = /^Alertas: (\d+) sin leer$/;

const login = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();
};

const bell = (page: Page) => page.getByRole("button", { name: UNREAD });

test.describe("Camila, ejecutiva", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("marca una alerta como leída desde la campana y el contador baja", async ({
    page,
  }) => {
    await page.goto("/#/");
    // Mientras cargan las alertas la campana dice 0: esperar a que lleguen.
    await expect(bell(page)).toHaveAccessibleName(
      /^Alertas: [1-9]\d* sin leer$/,
    );
    const before = Number(
      (await bell(page).getAttribute("aria-label"))?.match(UNREAD)?.[1],
    );
    const after = `Alertas: ${before - 1} sin leer`;

    await bell(page).click();
    const saved = page.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/alerts") &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Marcar leída" }).first().click();
    expect((await saved).ok()).toBe(true);
    await expect(bell(page)).toHaveAccessibleName(after);

    // Quedó guardada en la base, no solo en la caché.
    await page.reload();
    await expect(bell(page)).toHaveAccessibleName(after);
  });

  test("edita su firma en Perfil y sigue guardada al recargar", async ({
    page,
  }) => {
    const signature = `Camila Rojas · Ejecutiva e2e ${Date.now()}`;
    await page.goto("/#/profile");
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("textbox", { name: "Firma" }).fill(signature);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Tu perfil fue actualizado")).toBeVisible();

    await page.reload();
    await expect(page.getByText(signature)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Firma" })).toBeHidden();
  });
});
