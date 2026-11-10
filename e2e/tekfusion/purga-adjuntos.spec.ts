import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CAMILA,
  adminClient,
  functionsUrl,
  salesId,
  serviceRoleKey,
  signIn,
} from "./fixtures/supabase";

// Adjuntos contra el Storage, la base y las Edge Functions locales de verdad
// (sin pantalla): la purga diaria (purge-orphan-attachments) y el borrado al
// soltar un adjunto de una nota (delete_note_attachments) comparten la consulta
// de referencias de _shared/attachmentRefs.ts.
//
// La purga exige PURGE_CRON_SECRET en el edge runtime (supabase/functions/.env,
// ver su .env.example; el CI lo escribe en check.yml). Sin él responde 401 a
// todo: en local estos tests se saltan con aviso, en el CI fallan.
const BUCKET = "attachments";
const PURGE_SECRET = process.env.PURGE_CRON_SECRET ?? "solo-para-e2e-local";
const TWO_DAYS_AGO = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const purge = (bearer: string | undefined, body?: unknown) =>
  fetch(functionsUrl("purge-orphan-attachments"), {
    method: "POST",
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// Nombre con el formato de las subidas de la app: <carpeta>/<Math.random()>.<ext>.
const randomName = (folder: string, ext: string) =>
  `${folder}/${Math.random()}.${ext}`;

const upload = async (client: SupabaseClient, name: string) => {
  const { error } = await client.storage
    .from(BUCKET)
    .upload(name, new Blob(["archivo ficticio de e2e"]), {
      contentType: "text/plain",
    });
  if (error) throw new Error(`upload ${name}: ${error.message}`);
};

// Una función que ya estaba despierta guarda una conexión a la base; el
// `db reset` con que parte la suite la corta y su primera consulta responde
// 500 una vez (docs/10, 2026-11-09). Se la despierta antes de probar: en el
// CI arranca fría y esto no espera nada.
const awake = (call: () => Promise<Response>) =>
  expect
    .poll(async () => (await call()).status, { timeout: 15_000 })
    .not.toBe(500);

const existing = async (
  admin: SupabaseClient,
  names: string[],
): Promise<string[]> => {
  const { data, error } = await admin
    .schema("storage")
    .from("objects")
    .select("name")
    .eq("bucket_id", BUCKET)
    .in("name", names);
  if (error) throw new Error(`storage.objects: ${error.message}`);
  return data.map((row) => row.name).sort();
};

test.describe("Purga de adjuntos huérfanos", () => {
  let admin: SupabaseClient;
  let dealId: number;
  let contactId: number;
  let noteId: number;
  const files = {
    referenced: "",
    orphan: "",
    recentOrphan: "",
    contactOrphan: "",
    logo: "",
    avatar: "",
    config: "",
  };
  let baseline = 0;

  test.beforeAll(async () => {
    admin = adminClient();
    await awake(() => purge(PURGE_SECRET));
    const probe = await purge(PURGE_SECRET);
    test.skip(
      probe.status === 401 && !process.env.CI,
      "PURGE_CRON_SECRET no está en el edge runtime local (supabase/functions/.env)",
    );
    expect(probe.status).toBe(200);
    baseline = (await probe.json()).candidatos;

    const { data: deal, error } = await admin
      .from("deals")
      .select("id, contact_ids")
      .eq("sales_id", await salesId(CAMILA))
      .order("id")
      .limit(1)
      .single();
    if (error) throw new Error(error.message);
    dealId = deal.id;
    contactId = deal.contact_ids[0];

    files.referenced = randomName(`deals/${dealId}`, "pdf");
    files.orphan = randomName(`deals/${dealId}`, "pdf");
    files.recentOrphan = randomName(`deals/${dealId}`, "pdf");
    files.contactOrphan = randomName(`contacts/${contactId}`, "txt");
    files.logo = randomName("companies", "png");
    files.avatar = randomName("sales", "png");
    files.config = randomName("config", "png");
    for (const name of Object.values(files)) await upload(admin, name);

    // Todos con más de 24 h salvo recentOrphan (la purga no toca lo reciente).
    const { error: aged } = await admin
      .schema("storage")
      .from("objects")
      .update({ created_at: TWO_DAYS_AGO })
      .eq("bucket_id", BUCKET)
      .in(
        "name",
        Object.values(files).filter((name) => name !== files.recentOrphan),
      );
    if (aged) throw new Error(`envejecer archivos: ${aged.message}`);

    const { data: note, error: noteError } = await admin
      .from("deal_notes")
      .insert({
        deal_id: dealId,
        text: "Nota de e2e con adjunto (purga)",
        attachments: [{ path: files.referenced, title: "orden.pdf" }],
      })
      .select("id")
      .single();
    if (noteError) throw new Error(noteError.message);
    noteId = note.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    if (noteId) await admin.from("deal_notes").delete().eq("id", noteId);
    await admin.storage.from(BUCKET).remove(Object.values(files));
  });

  test("solo acepta su secreto propio: ni sin credencial, ni con otra, ni con el service role key", async () => {
    expect((await purge(undefined)).status).toBe(401);
    expect((await purge("otro-secreto")).status).toBe(401);
    expect((await purge(serviceRoleKey())).status).toBe(401);
    expect(
      (
        await fetch(functionsUrl("purge-orphan-attachments"), {
          headers: { Authorization: `Bearer ${PURGE_SECRET}` },
        })
      ).status,
    ).toBe(405);
  });

  test("el simulacro cuenta solo los huérfanos antiguos de deals/ y contacts/ y no borra nada", async () => {
    const response = await purge(PURGE_SECRET);

    expect(response.status).toBe(200);
    // Dos huérfanos nuevos (el del lead y el del contacto). No cuentan el
    // referenciado por la nota, el reciente, ni el logo, el avatar y el de
    // configuración, aunque ninguna fila los nombre.
    expect(await response.json()).toEqual({
      candidatos: baseline + 2,
      borrados: 0,
    });
    expect(await existing(admin, Object.values(files))).toEqual(
      Object.values(files).sort(),
    );
  });

  test("un cuerpo que no es {apply} se rechaza sin tocar nada", async () => {
    expect((await purge(PURGE_SECRET, { apply: "sí" })).status).toBe(400);
    expect((await purge(PURGE_SECRET, { borrar: true })).status).toBe(400);
    expect(await existing(admin, Object.values(files))).toHaveLength(7);
  });

  test("con apply borra los huérfanos antiguos y deja todo lo demás", async () => {
    const response = await purge(PURGE_SECRET, { apply: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      candidatos: baseline + 2,
      borrados: baseline + 2,
    });
    expect(await existing(admin, Object.values(files))).toEqual(
      [
        files.referenced,
        files.recentOrphan,
        files.logo,
        files.avatar,
        files.config,
      ].sort(),
    );
    expect(await (await purge(PURGE_SECRET)).json()).toEqual({
      candidatos: 0,
      borrados: 0,
    });
  });
});

test("al quitar un adjunto de una nota, su archivo se borra del bucket; el que otra nota todavía usa, no", async () => {
  const admin = adminClient();
  const camila = await signIn(CAMILA);
  const camilaId = await salesId(CAMILA);
  const { data: auth } = await camila.auth.getSession();
  await awake(() =>
    fetch(functionsUrl("delete_note_attachments"), {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.session!.access_token}` },
      body: JSON.stringify({
        old_record: { attachments: [{ path: "deals/0/0.0000000001.pdf" }] },
      }),
    }),
  );
  const { data: deal } = await admin
    .from("deals")
    .select("id")
    .eq("sales_id", camilaId)
    .order("id")
    .limit(1)
    .single();
  const own = randomName(`deals/${deal!.id}`, "pdf");
  const shared = randomName(`deals/${deal!.id}`, "pdf");
  await upload(camila, own);
  await upload(camila, shared);
  const { data: notes, error } = await camila
    .from("deal_notes")
    .insert([
      {
        deal_id: deal!.id,
        sales_id: camilaId,
        text: "Nota de e2e con dos adjuntos",
        attachments: [{ path: own }, { path: shared }],
      },
      {
        deal_id: deal!.id,
        sales_id: camilaId,
        text: "Nota de e2e que comparte un adjunto",
        attachments: [{ path: shared }],
      },
    ])
    .select("id");
  if (error) throw new Error(error.message);

  // Camila suelta los dos adjuntos de la primera nota: el trigger llama a
  // delete_note_attachments con su sesión.
  const { error: updateError } = await camila
    .from("deal_notes")
    .update({ attachments: [] })
    .eq("id", notes![0].id);
  expect(updateError).toBeNull();

  await expect
    .poll(() => existing(admin, [own, shared]), { timeout: 20_000 })
    .toEqual([shared]);

  // Y al borrar la segunda nota se va el que quedaba.
  await camila.from("deal_notes").delete().eq("id", notes![1].id);
  await admin.from("deal_notes").delete().eq("id", notes![0].id);
  await expect
    .poll(() => existing(admin, [shared]), { timeout: 20_000 })
    .toEqual([]);
});
