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

  test("abre su chat de WhatsApp y queda leído, sin salir de la sesión", async ({
    page,
  }) => {
    await page.goto("/#/whatsapp");
    await expect(page.getByRole("tab", { name: "Todos" })).toHaveCount(0);
    // En "Mis chats" solo está la suya (la del lead cotizado), con no leídos.
    const chat = page.getByRole("listitem").getByRole("button");
    await expect(chat).toHaveCount(1);
    await expect(chat.getByLabel(/sin leer$/)).toBeVisible();

    const read = page.waitForResponse((response) =>
      response.url().includes("/rest/v1/rpc/mark_wa_conversation_read"),
    );
    await chat.click();
    expect((await read).ok()).toBe(true);

    const panel = page.getByRole("region").filter({ hasText: "+56900000001" });
    await expect(
      panel.getByText("Quedo atento a la cotización actualizada."),
    ).toBeVisible();
    await expect(chat.getByLabel(/sin leer$/)).toHaveCount(0);
    await expect(
      panel.getByRole("textbox", { name: "Escribe un mensaje" }),
    ).toBeDisabled();

    // Quedó leído en la base y la sesión sigue abierta.
    await page.reload();
    await expect(chat).toHaveCount(1);
    await expect(chat.getByLabel(/sin leer$/)).toHaveCount(0);
  });

  test("toma la conversación sin asignar y pasa a sus chats", async ({
    page,
  }) => {
    await page.goto("/#/whatsapp");
    await page.getByRole("tab", { name: "Sin asignar" }).click();
    const chats = page.getByRole("listitem").getByRole("button");
    await expect(chats).toHaveCount(1);
    await chats.click();

    const taken = page.waitForResponse((response) =>
      response.url().includes("/rest/v1/rpc/take_wa_conversation"),
    );
    await page.getByRole("button", { name: "Tomar", exact: true }).click();
    expect((await taken).ok()).toBe(true);
    await expect(page.getByText("Tomaste la conversación")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tomar", exact: true }),
    ).toHaveCount(0);

    // Tomada y leída al abrirla: ahora tiene dos chats y ninguno con no leídos.
    await page.getByRole("tab", { name: "Mis chats" }).click();
    const mine = page.getByRole("listitem").getByRole("button");
    await expect(mine).toHaveCount(2);
    await expect(mine.getByLabel(/sin leer$/)).toHaveCount(0);
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
