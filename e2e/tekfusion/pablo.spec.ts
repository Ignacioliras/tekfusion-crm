import { expect, test } from "@playwright/test";

// Pablo (lector, sin TOTP) sobre el seed ficticio: no tiene bandeja de WhatsApp.
const EMAIL = "pablo.herrera@tekfusion-demo.cl";
const PASSWORD = "demo-tekfusion";

test("el lector no ve WhatsApp en el menú y la bandeja le niega el acceso", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();

  await expect(
    page.getByRole("link", { name: "Pipeline", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveCount(0);

  await page.goto("/#/whatsapp");
  await expect(
    page.getByText(
      "Tu perfil no tiene acceso a las conversaciones de WhatsApp.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByLabel("Contraseña")).toBeHidden();
});
