import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

import { totp, totpStep } from "./fixtures/totp";

const DEALS_SAMPLE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/components/atomic-crm/dataImport/deals_sample.csv",
);
// Filas de deals_sample.csv en etapas que el kanban muestra, por columna.
const IMPORTED_LEADS = [
  ["Nuevo", "Válvulas mariposa 8 pulgadas"],
  ["Contactado", "Geoceldas para talud de acceso"],
  ["Cotizado", "Tubería HDPE 315 mm"],
] as const;

// Andrea (gerencia) sobre el seed ficticio recién reseteado por
// scripts/tekfusion/e2e.mjs. El seed no le crea factor TOTP: el primer test lo
// inscribe leyendo el secreto de la pantalla y los demás reutilizan la sesión.
const EMAIL = "andrea.soto@tekfusion-demo.cl";
const PASSWORD = "demo-tekfusion";
const SEED_USERS = [
  "andrea.soto@tekfusion-demo.cl",
  "camila.rojas@tekfusion-demo.cl",
  "diego.munoz@tekfusion-demo.cl",
  "pablo.herrera@tekfusion-demo.cl",
];
const CADENCE_LABEL = "Cadencia por defecto (días)";
// CardTitle es un div, no un heading.
const dashboardTitle = (page: Page) =>
  page.getByText("Métricas comerciales", { exact: true });
// La primera carga del dashboard hace que Vite optimice dependencias y recargue.
const FIRST_LOAD_TIMEOUT = 20_000;

const loginWithPassword = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();
};

test.describe.serial("Andrea, gerencia con TOTP", () => {
  let page: Page;
  let secret = "";
  let lastUsedStep = -1;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("inscribe el factor, entra, sale y vuelve a entrar con el código", async () => {
    // Puede esperar hasta un paso TOTP completo (30 s) antes de reingresar.
    test.setTimeout(90_000);

    await loginWithPassword(page);
    await expect(
      page.getByRole("heading", {
        name: "Activa la verificación en dos pasos",
      }),
    ).toBeVisible();
    secret = (await page.locator("form code").innerText()).trim();
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);

    lastUsedStep = totpStep();
    await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(
      page.getByText("Verificación en dos pasos activada"),
    ).toBeVisible();
    await expect(dashboardTitle(page)).toBeVisible({
      timeout: FIRST_LOAD_TIMEOUT,
    });

    // El avatar sin foto muestra la inicial: es el botón del menú de usuario.
    await page.getByRole("button", { name: "A", exact: true }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await loginWithPassword(page);
    await expect(
      page.getByRole("heading", { name: "Verificación en dos pasos" }),
    ).toBeVisible();

    // Un código ya usado se rechaza: esperar al paso siguiente.
    await expect
      .poll(() => totpStep(), { timeout: 35_000, intervals: [500] })
      .toBeGreaterThan(lastUsedStep);
    lastUsedStep = totpStep();
    await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(dashboardTitle(page)).toBeVisible();
  });

  test("ve el dashboard con métricas y el ranking de ejecutivos", async () => {
    await page.goto("/#/");
    await expect(dashboardTitle(page)).toBeVisible();
    await page.getByRole("button", { name: "Últimos 90 días" }).click();

    const leads = page.getByRole("group", { name: "Leads", exact: true });
    await expect(leads).toBeVisible();
    await expect(leads.getByText(/^[1-9]\d*$/)).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Leads por línea" }),
    ).toBeVisible();

    const ranking = page.getByRole("region", {
      name: "Ranking de ejecutivos",
    });
    await expect(
      ranking.getByRole("columnheader", { name: "Leads atendidos" }),
    ).toBeVisible();
    await expect(
      ranking.getByRole("cell", { name: "Camila Rojas" }),
    ).toBeVisible();
    await expect(
      ranking.getByRole("cell", { name: "Diego Muñoz" }),
    ).toBeVisible();
  });

  test("cambia la cadencia por defecto, la guarda y la deja como estaba", async () => {
    const saveCadence = async (value: string) => {
      await page.getByRole("textbox", { name: CADENCE_LABEL }).fill(value);
      await page.getByRole("button", { name: "Guardar", exact: true }).click();
      await expect(page.getByText("Configuración guardada")).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("textbox", { name: CADENCE_LABEL }),
      ).toHaveValue(value);
    };

    await page.goto("/#/settings");
    const cadence = page.getByRole("textbox", { name: CADENCE_LABEL });
    await expect(cadence).not.toHaveValue("");
    const original = await cadence.inputValue();
    const changed = original === "3, 7, 14" ? "4, 8, 15" : "3, 7, 14";

    await saveCadence(changed);
    await saveCadence(original);
  });

  test("importa deals_sample.csv desde el kanban y ve los leads importados", async () => {
    await page.goto("/#/deals");
    await page.getByRole("button", { name: "Importar CSV" }).click();
    const dialog = page.getByRole("dialog", { name: "Importar leads" });
    await dialog.locator('input[type="file"]').setInputFiles(DEALS_SAMPLE);
    await dialog.getByRole("button", { name: "Iniciar importación" }).click();

    const report = page.getByRole("dialog", {
      name: "Resultado de la importación",
    });
    // Creados, duplicados, errores.
    await expect(report.getByRole("definition")).toHaveText(["6", "0", "0"]);
    // La X del diálogo también se llama "Cerrar": el primero es el del pie.
    await report.getByRole("button", { name: "Cerrar" }).first().click();
    await expect(report).toBeHidden();

    for (const [column, lead] of IMPORTED_LEADS) {
      await expect(
        page.getByRole("region", { name: column }).getByText(lead),
      ).toBeVisible();
    }
  });

  test("ve la lista de usuarios con los 4 del seed", async () => {
    await page.goto("/#/sales");
    for (const email of SEED_USERS) {
      await expect(page.getByRole("cell", { name: email })).toBeVisible();
    }
    await expect(
      page.getByRole("cell", { name: /@tekfusion-demo\.cl$/ }),
    ).toHaveCount(SEED_USERS.length);
  });
});
