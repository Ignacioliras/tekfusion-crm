import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

// Flujo comercial de punta a punta como Camila (ejecutiva, sin TOTP), sobre el
// seed ficticio recién reseteado por scripts/tekfusion/e2e.mjs.
const EMAIL = "camila.rojas@tekfusion-demo.cl";
const PASSWORD = "demo-tekfusion";
const PDF = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/cotizacion.pdf",
);

const leadData = (page: Page) =>
  page.getByRole("region", { name: "Datos del lead" });

const login = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();
};

test.describe.serial("flujo de un lead", () => {
  let quotedLeadUrl = "";

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("crea un lead manual y lo marca perdido con motivo", async ({
    page,
  }) => {
    const product = `Válvula e2e ${Date.now()}`;
    await page.goto("/#/deals/create");
    const dialog = page.getByRole("dialog", { name: "Nuevo lead" });
    await dialog.getByRole("textbox", { name: /Producto/ }).fill(product);
    const company = dialog.getByRole("combobox", { name: "Empresa" });
    await company.click();
    const firstCompany = page.getByRole("option").first();
    const companyName = (await firstCompany.innerText()).trim();
    await firstCompany.click();
    await expect(company).toContainText(companyName);
    // Al elegir empresa se abren las sugerencias de Contacto: cerrarlas antes
    // de guardar, o el clic en Guardar solo cierra la lista.
    await dialog.getByRole("heading", { name: "Nuevo lead" }).click();
    await expect(dialog.getByRole("listbox")).toBeHidden();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog).toBeHidden();

    await expect(
      leadData(page).getByText("Nuevo", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(product).first()).toBeVisible();

    await page.getByRole("button", { name: "Perdido", exact: true }).click();
    const lost = page.getByRole("dialog", { name: "Marcar como perdido" });
    await lost.getByRole("button", { name: "Confirmar" }).click();
    await expect(lost.getByText("El motivo es obligatorio")).toBeVisible();

    await lost.getByRole("combobox", { name: /Motivo de pérdida/ }).click();
    await page.getByRole("option", { name: "Precio" }).click();
    await lost.getByRole("button", { name: "Confirmar" }).click();

    await expect(lost).toBeHidden();
    await expect(
      leadData(page).getByText("Perdido", { exact: true }),
    ).toBeVisible();
    await expect(leadData(page).getByText("Precio")).toBeVisible();
  });

  test("envía una cotización por correo y el lead pasa a Cotizado", async ({
    page,
  }) => {
    await page.goto("/#/deals");
    const column = page.getByRole("region", { name: "Contactado" });
    await column.locator("[data-rfd-draggable-id]").first().click();

    await page.getByRole("button", { name: "Enviar cotización" }).click();
    const dialog = page.getByRole("dialog", { name: "Enviar cotización" });
    await dialog.locator('input[type="file"]').setInputFiles(PDF);
    await dialog.getByLabel(/^Monto/).fill("1500000");
    await expect(dialog.getByRole("switch", { name: "Correo" })).toBeChecked();
    await dialog.getByRole("button", { name: "Enviar cotización" }).click();

    await expect(dialog).toBeHidden();
    await expect(
      leadData(page).getByText("Cotizado", { exact: true }),
    ).toBeVisible();
    quotedLeadUrl = page.url();
  });

  test("programa un seguimiento con plantilla y aparece en la lista", async ({
    page,
  }) => {
    expect(quotedLeadUrl).not.toBe("");
    await page.goto(quotedLeadUrl);
    const list = page.getByRole("region", { name: "Seguimientos" });
    const steps = list.getByText(/^Paso \d+/);
    await expect(
      page.getByRole("button", { name: "Programar seguimiento" }),
    ).toBeVisible();
    const before = await steps.count();

    await page.getByRole("button", { name: "Programar seguimiento" }).click();
    const dialog = page.getByRole("dialog", { name: "Programar seguimiento" });
    await dialog
      .getByRole("region", { name: "Mensaje por correo" })
      .getByRole("combobox", { name: "Plantilla" })
      .click();
    await page.getByRole("option", { name: "Seguimiento 1 · correo" }).click();
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(dialog).toBeHidden();
    await expect(steps).toHaveCount(before + 1);
  });
});
