import { expect, test, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ANDREA,
  CAMILA,
  PABLO,
  PASSWORD,
  adminClient,
  resetMfa,
  signIn,
  signInAal2,
} from "./fixtures/supabase";
import { totp } from "./fixtures/totp";

// Indicador de conexión de WhatsApp contra el Supabase local: el punto del
// menú y el banner de la bandeja leen wa_connection_status(); la tabla
// wa_instance_status (con el cuerpo crudo de Evolution en last_event) sigue
// cerrada. Corre después de whatsapp-enviar.spec.ts (orden alfabético).
const INSTANCE = "tekfusion-demo";

const setConnected = async (admin: SupabaseClient, connected: boolean) => {
  const { error } = await admin.rpc("wa_upsert_instance_status", {
    p_instance: INSTANCE,
    p_connected: connected,
    p_event: {
      event: "connection.update",
      state: connected ? "open" : "close",
      apikey: "clave-ficticia-que-nadie-debe-ver",
    },
  });
  if (error) throw new Error(`wa_upsert_instance_status: ${error.message}`);
};

const login = async (page: Page, email: string) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();
};

const dot = (page: Page, label: string) =>
  page
    .getByRole("link", { name: /^WhatsApp/ })
    .getByRole("img", { name: label });
const banner = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "WhatsApp desconectado" });
const settingsLink = (page: Page) =>
  banner(page).getByRole("link", { name: "Ir a Configuración" });

test.describe("Indicador de conexión de WhatsApp", () => {
  let admin: SupabaseClient;

  test.beforeAll(async () => {
    admin = adminClient();
    await setConnected(admin, true);
  });

  test.afterAll(async () => {
    await setConnected(admin, true);
  });

  test("la RPC entrega solo connected y updated_at a cada rol, y la tabla sigue cerrada", async () => {
    const sessions = {
      ejecutiva: await signIn(CAMILA),
      lector: await signIn(PABLO),
      gerencia: await signInAal2(ANDREA),
    };

    for (const [role, client] of Object.entries(sessions)) {
      const status = await client.rpc("wa_connection_status");
      const table = await client.from("wa_instance_status").select("*");

      expect(status.error, role).toBeNull();
      expect(status.data, role).toHaveLength(1);
      expect(Object.keys(status.data[0]).sort(), role).toEqual([
        "connected",
        "updated_at",
      ]);
      expect(status.data[0].connected, role).toBe(true);
      expect(table.error?.code, role).toBe("42501");
    }
  });

  test("Camila ve el punto verde y, al desconectarse el número, el punto rojo y el banner sin enlace a Configuración", async ({
    page,
  }) => {
    await login(page, CAMILA);
    await page.goto("/#/whatsapp");
    await expect(dot(page, "WhatsApp conectado")).toBeVisible();
    await expect(banner(page)).toHaveCount(0);

    await setConnected(admin, false);
    await page.reload();

    await expect(dot(page, "WhatsApp desconectado")).toBeVisible();
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText(
      "Los mensajes no salen ni llegan hasta que se reconecte el número.",
    );
    await expect(settingsLink(page)).toHaveCount(0);
  });

  test("Andrea ve el banner con el enlace a Configuración mientras está desconectado", async ({
    page,
  }) => {
    await setConnected(admin, false);
    await resetMfa(ANDREA);
    await login(page, ANDREA);
    const secret = (await page.locator("form code").innerText()).trim();
    await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(
      page.getByText("Verificación en dos pasos activada"),
    ).toBeVisible();

    await page.goto("/#/whatsapp");

    await expect(dot(page, "WhatsApp desconectado")).toBeVisible();
    await expect(banner(page)).toBeVisible();
    await expect(settingsLink(page)).toBeVisible();
  });
});
