import { expect, test, type Page } from "@playwright/test";
import {
  REALTIME_SUBSCRIBE_STATES,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  ANDREA,
  CAMILA,
  DIEGO,
  PABLO,
  PASSWORD,
  adminClient,
  resetMfa,
  signIn,
  signInAal2,
} from "./fixtures/supabase";
import { totp } from "./fixtures/totp";

// Tiempo real de la bandeja contra el Realtime local de verdad, con la sesión
// de cada usuario del seed: la RLS de wa_conversations / wa_messages decide a
// quién le llega cada cambio (14_tekfusion_whatsapp.sql). Corre después de
// camila.spec.ts y whatsapp-enviar.spec.ts (orden alfabético, 1 worker).
const CAMILA_PHONE = "+56900000001";
const DIEGO_PHONE = "+56900000002";

interface Seen {
  table: "wa_messages" | "wa_conversations";
  conversationId: number;
}

// Escucha lo mismo que la bandeja (useWaRealtime.ts) pero sin filtro por
// conversación: si algo ajeno llegara, se vería.
const listen = async (client: SupabaseClient, name: string) => {
  const events: Seen[] = [];
  await new Promise<void>((resolve, reject) => {
    let subscribed = false;
    let listening = false;
    const done = () => subscribed && listening && resolve();
    client
      .channel(`e2e-${name}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_messages" },
        (change) =>
          events.push({
            table: "wa_messages",
            conversationId: (change.new as { conversation_id: number })
              .conversation_id,
          }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_conversations" },
        (change) =>
          events.push({
            table: "wa_conversations",
            conversationId: (change.new as { id: number }).id,
          }),
      )
      // Realtime avisa cuando la escucha de la base quedó armada: un cambio
      // hecho antes de este aviso no se entrega.
      .on("system", {}, (message: { extension: string; status: string }) => {
        if (message.extension !== "postgres_changes") return;
        if (message.status !== "ok")
          reject(new Error(`${name}: ${JSON.stringify(message)}`));
        listening = true;
        done();
      })
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          subscribed = true;
          done();
        } else if (status !== REALTIME_SUBSCRIBE_STATES.CLOSED) {
          reject(new Error(`${name}: canal ${status}`));
        }
      });
  });
  return events;
};

// Los mensajes de un mismo socket llegan en orden: cuando este canal nuevo
// queda suscrito, cualquier evento anterior destinado a ese cliente ya llegó.
const flush = (client: SupabaseClient, name: string) =>
  new Promise<void>((resolve) => {
    client.channel(`e2e-flush-${name}`).subscribe((status) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) resolve();
    });
  });

let sequence = 0;
const ingest = async (admin: SupabaseClient, phone: string, text: string) => {
  const { error } = await admin.rpc("wa_ingest_message", {
    p_instance: "tekfusion-e2e",
    p_wa_message_id: `e2e-rt-${Date.now()}-${++sequence}`,
    p_phone: phone,
    p_direction: "entrante",
    p_type: "texto",
    p_text: text,
    p_sent_at: new Date().toISOString(),
    p_payload: null,
  });
  if (error) throw new Error(`wa_ingest_message: ${error.message}`);
};

const messagesIn = (events: Seen[], conversationId: number) =>
  events.filter(
    (e) => e.table === "wa_messages" && e.conversationId === conversationId,
  ).length;

test("un mensaje nuevo llega por Realtime solo a quien puede leer esa conversación", async () => {
  const admin = adminClient();
  const { data: conversations, error } = await admin
    .from("wa_conversations")
    .select("id, phone")
    .in("phone", [CAMILA_PHONE, DIEGO_PHONE]);
  if (error) throw new Error(error.message);
  const camilaChat = conversations.find((c) => c.phone === CAMILA_PHONE)!.id;
  const diegoChat = conversations.find((c) => c.phone === DIEGO_PHONE)!.id;

  // Arrange: cinco sesiones reales escuchando.
  const manager = await signInAal2(ANDREA);
  const clients = {
    manager,
    managerWithoutTotp: await signIn(ANDREA),
    camila: await signIn(CAMILA),
    diego: await signIn(DIEGO),
    reader: await signIn(PABLO),
  };
  const seen = Object.fromEntries(
    await Promise.all(
      Object.entries(clients).map(
        async ([name, client]) => [name, await listen(client, name)] as const,
      ),
    ),
  ) as Record<keyof typeof clients, Seen[]>;

  // Act: Diego, Camila, Diego. Cada cliente recibe en el orden de la base, así
  // que el mensaje siguiente al ajeno sirve de barrera: si el ajeno le fuera a
  // llegar, llegaría antes.
  await ingest(admin, DIEGO_PHONE, "Mensaje 1, chat de Diego");
  await ingest(admin, CAMILA_PHONE, "Mensaje 2, chat de Camila");
  await ingest(admin, DIEGO_PHONE, "Mensaje 3, chat de Diego");
  await expect.poll(() => messagesIn(seen.diego, diegoChat)).toBe(2);
  await expect.poll(() => messagesIn(seen.camila, camilaChat)).toBe(1);
  await expect.poll(() => messagesIn(seen.manager, diegoChat)).toBe(2);
  await ingest(admin, CAMILA_PHONE, "Mensaje 4, chat de Camila");
  await expect.poll(() => messagesIn(seen.camila, camilaChat)).toBe(2);
  await flush(clients.reader, "reader");
  await flush(clients.managerWithoutTotp, "managerWithoutTotp");

  // Assert
  expect(seen.camila.map((e) => e.conversationId)).not.toContain(diegoChat);
  expect(seen.diego.map((e) => e.conversationId)).not.toContain(camilaChat);
  expect(seen.reader).toEqual([]);
  expect(seen.managerWithoutTotp).toEqual([]);
  // Control: gerencia con verificación en dos pasos sí recibe las dos.
  expect(messagesIn(seen.manager, camilaChat)).toBeGreaterThanOrEqual(1);

  await Promise.all(
    Object.values(clients).map((client) => client.removeAllChannels()),
  );
});

const login = async (page: Page, email: string) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar sesi/i }).click();
  await expect(page.getByLabel("Contraseña")).toBeHidden();
};

test("en la bandeja de Camila aparece sin recargar el mensaje nuevo de su chat y no el de Diego", async ({
  browser,
}) => {
  const admin = adminClient();
  const stamp = Date.now();
  const forCamila = `Mensaje en vivo para Camila ${stamp}`;
  const forDiego = `Mensaje en vivo para Diego ${stamp}`;
  const camilaContext = await browser.newContext();
  const diegoContext = await browser.newContext();
  const camilaPage = await camilaContext.newPage();
  const diegoPage = await diegoContext.newPage();
  await login(camilaPage, CAMILA);
  await login(diegoPage, DIEGO);
  await camilaPage.goto("/#/whatsapp");
  await diegoPage.goto("/#/whatsapp");
  // La lista ya cargó en las dos pantallas (el extracto del seed está a la vista).
  await expect(camilaPage.getByRole("listitem").first()).toBeVisible();
  await expect(diegoPage.getByRole("listitem").first()).toBeVisible();

  await ingest(admin, DIEGO_PHONE, forDiego);
  await ingest(admin, CAMILA_PHONE, forCamila);

  await expect(camilaPage.getByText(forCamila)).toBeVisible();
  await expect(diegoPage.getByText(forDiego)).toBeVisible();
  await expect(camilaPage.getByText(forDiego)).toHaveCount(0);
  await expect(diegoPage.getByText(forCamila)).toHaveCount(0);

  await camilaContext.close();
  await diegoContext.close();
});

// Andrea entra con contraseña, inscribe y verifica su código, y abre "Todos".
const openManagerInbox = async (page: Page) => {
  await resetMfa(ANDREA);
  await login(page, ANDREA);
  const secret = (await page.locator("form code").innerText()).trim();
  await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(
    page.getByText("Verificación en dos pasos activada"),
  ).toBeVisible();
  await page.goto("/#/whatsapp");
};

const showAll = async (page: Page) => {
  await page.getByRole("tab", { name: "Todos" }).click();
  await expect(page.getByRole("listitem").first()).toBeVisible();
};

test("en la bandeja de gerencia aparece sin recargar un mensaje nuevo, con la página cargada ya verificada", async ({
  page,
}) => {
  const text = `Mensaje en vivo para gerencia ${Date.now()}`;
  await openManagerInbox(page);
  // Al cargar, la página parte con la sesión ya verificada (aal2).
  await page.reload();
  await showAll(page);

  await ingest(adminClient(), DIEGO_PHONE, text);

  await expect(page.getByText(text)).toBeVisible();
});

// FALLA HOY (docs/10, 2026-11-09, "Hallazgos sin arreglar", Realtime de
// gerencia): supabase-js le deja a Realtime el token del ingreso con
// contraseña (aal1) y no lo cambia al verificar el código, así que la RLS no
// le entrega nada a gerencia hasta que el token se refresca o se recarga la
// página. Quitar el fixme cuando se arregle.
test.fixme("en la bandeja de gerencia, recién verificado el código y sin recargar la página, aparece un mensaje nuevo", async ({
  page,
}) => {
  const text = `Mensaje en vivo para gerencia ${Date.now()}`;
  await openManagerInbox(page);
  await showAll(page);

  await ingest(adminClient(), DIEGO_PHONE, text);

  await expect(page.getByText(text)).toBeVisible();
});
