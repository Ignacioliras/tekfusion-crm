import { expect, test, type Page } from "@playwright/test";

// Camila (ejecutiva, sin TOTP) escribe desde la bandeja sobre el seed ficticio.
// Corre después de camila.spec.ts (orden alfabético, 1 worker): para entonces
// también tiene la conversación que tomó; la suya del seed se reconoce por el
// último mensaje del cliente.
const EMAIL = "camila.rojas@tekfusion-demo.cl";
const PASSWORD = "demo-tekfusion";
const PHONE = "+56900000001";
const LAST_INBOUND = "Quedo atento a la cotización actualizada.";
const GREETING =
  "Hola, gracias por escribir a TekFusion. ¿En qué le podemos ayudar?";

const login = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();
};

// Su chat del seed en la lista: el extracto es el último mensaje, el del
// cliente o, después del primer test, el que ella envió.
const ownChat = (page: Page) =>
  page
    .getByRole("listitem")
    .getByRole("button")
    .filter({ hasText: /Quedo atento a la cotización|gracias por escribir/ });

const panelOf = (page: Page) =>
  page.getByRole("region").filter({ hasText: PHONE });

// La bandeja nunca lista conversaciones archivadas y, tras camila.spec.ts, no
// queda ninguna sin asignar; sumarlas al seed rompería los conteos de
// camila.spec.ts y de 35_rls_whatsapp. Se reescribe la respuesta real de la
// lista para que el panel reciba la de Camila como la describiría la base.
const serveOwnChatAs = (page: Page, patch: Record<string, unknown>) =>
  page.route(
    (url) => url.pathname.endsWith("/rest/v1/wa_conversations"),
    async (route) => {
      const response = await route.fetch();
      const rows = (await response.json()) as { phone: string }[];
      await route.fulfill({
        response,
        json: rows.map((row) =>
          row.phone === PHONE ? { ...row, ...patch } : row,
        ),
      });
    },
  );

const expectComposerDisabled = async (page: Page) => {
  const panel = panelOf(page);
  await expect(
    panel.getByRole("textbox", { name: "Escribe un mensaje" }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("button", { name: "Respuestas rápidas" }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("button", { name: "Enviar", exact: true }),
  ).toBeDisabled();
};

test.describe("Camila escribe desde la bandeja de WhatsApp", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("escribe, suma una respuesta rápida, envía y ve el mensaje en cola", async ({
    page,
  }) => {
    const text = `Le confirmo el plazo por aquí (e2e ${Date.now()}).`;
    await page.goto("/#/whatsapp");
    await ownChat(page).click();

    const panel = panelOf(page);
    const composer = panel.getByRole("textbox", { name: "Escribe un mensaje" });
    await expect(composer).toBeEnabled();
    await composer.fill(text);
    await panel.getByRole("button", { name: "Respuestas rápidas" }).click();
    await page
      .getByRole("dialog", { name: "Respuestas rápidas" })
      .getByRole("button", { name: /^Saludo/ })
      .click();
    await expect(composer).toHaveValue(`${text}\n${GREETING}`);

    const sent = page.waitForResponse((response) =>
      response.url().includes("/rest/v1/rpc/send_wa_message"),
    );
    await panel.getByRole("button", { name: "Enviar", exact: true }).click();
    expect((await sent).ok()).toBe(true);
    await expect(composer).toHaveValue("");

    const bubble = panel.getByRole("listitem").filter({ hasText: text });
    await expect(bubble).toContainText(GREETING);
    await expect(bubble.getByRole("img", { name: "Pendiente" })).toBeVisible();

    // Quedó guardado en la base, en cola hasta que whatsapp-send lo despache.
    await page.reload();
    await ownChat(page).click();
    await expect(
      panelOf(page)
        .getByRole("listitem")
        .filter({ hasText: text })
        .getByRole("img", { name: "Pendiente" }),
    ).toBeVisible();
  });

  test("en una conversación sin asignar el cuadro está deshabilitado", async ({
    page,
  }) => {
    await serveOwnChatAs(page, { sales_id: null });
    await page.goto("/#/whatsapp");
    await ownChat(page).click();

    await expect(
      panelOf(page).getByRole("button", { name: "Tomar", exact: true }),
    ).toBeVisible();
    await expectComposerDisabled(page);
  });

  test("en una conversación archivada el cuadro está deshabilitado", async ({
    page,
  }) => {
    await serveOwnChatAs(page, { archived: true });
    await page.goto("/#/whatsapp");
    await ownChat(page).click();

    await expect(panelOf(page).getByText(LAST_INBOUND)).toBeVisible();
    await expectComposerDisabled(page);
  });
});
