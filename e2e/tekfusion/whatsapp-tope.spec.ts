import { expect, test } from "@playwright/test";

import {
  ANDREA,
  DIEGO,
  adminClient,
  salesId,
  signIn,
  signInAal2,
} from "./fixtures/supabase";

// send_wa_message contra la API local de verdad, con llamadas simultáneas (lo
// que pgTAP no puede hacer: una sola sesión). Diego no escribe en ningún otro
// spec, así que su minuto empieza en cero. Corre al final (orden alfabético).
const SEED_PHONE = "+56900000002";
const LIMIT = 30;
const CALLS = 40;

test("40 envíos simultáneos en tres conversaciones: pasan 30 y los otros 10 reciben 429; archivada y sin asignar se rechazan", async () => {
  // Arrange: tres conversaciones de Diego (el candado es por usuario, no por conversación).
  const admin = adminClient();
  const diegoId = await salesId(DIEGO);
  const diego = await signIn(DIEGO);
  const stamp = String(Date.now()).slice(-7);
  const { data: extra, error } = await admin
    .from("wa_conversations")
    .insert([
      { phone: `+5699${stamp}1`, sales_id: diegoId },
      { phone: `+5699${stamp}2`, sales_id: diegoId },
    ])
    .select("id");
  if (error) throw new Error(error.message);
  const { data: seed } = await admin
    .from("wa_conversations")
    .select("id")
    .eq("phone", SEED_PHONE)
    .single();
  const conversations = [seed!.id, extra[0].id, extra[1].id];
  const writtenThisMinute = async () =>
    (
      await admin
        .from("wa_messages")
        .select("id", { count: "exact", head: true })
        .eq("author_sales_id", diegoId)
        .eq("origin", "crm")
        .gt("created_at", new Date(Date.now() - 60_000).toISOString())
    ).count;
  expect(await writtenThisMinute()).toBe(0);

  // Act
  const results = await Promise.all(
    Array.from({ length: CALLS }, (_, i) =>
      diego.rpc("send_wa_message", {
        conversation_id: conversations[i % conversations.length],
        text: `Mensaje simultáneo ${i + 1}`,
      }),
    ),
  );

  // Assert
  const rejected = results.filter((r) => r.error);
  expect(results.length - rejected.length).toBe(LIMIT);
  expect(rejected.map((r) => [r.status, r.error!.code])).toEqual(
    Array(CALLS - LIMIT).fill([429, "PT429"]),
  );
  expect(await writtenThisMinute()).toBe(LIMIT);
  const queued = await admin
    .from("send_queue")
    .select("id", { count: "exact", head: true })
    .eq("sales_id", diegoId)
    .not("message_id", "is", null);
  expect(queued.count).toBe(LIMIT);

  // Archivada: ni su dueño ni gerencia (y manda sobre el tope: P0002, no 429).
  await admin
    .from("wa_conversations")
    .update({ archived: true })
    .eq("id", conversations[1]);
  const manager = await signInAal2(ANDREA);
  for (const client of [diego, manager]) {
    const { error: archived } = await client.rpc("send_wa_message", {
      conversation_id: conversations[1],
      text: "A una archivada",
    });
    expect(archived?.code).toBe("P0002");
    expect(archived?.message).toContain("is archived");
  }

  // Sin asignar: tampoco gerencia; primero se toma (decisión del 2026-11-09).
  const { data: unassigned } = await admin
    .from("wa_conversations")
    .insert({ phone: `+5699${stamp}3` })
    .select("id")
    .single();
  const refused = await manager.rpc("send_wa_message", {
    conversation_id: unassigned!.id,
    text: "A una sin asignar",
  });
  expect(refused.error?.code).toBe("42501");
  expect(refused.error?.message).toContain("is unassigned");
  await manager.rpc("take_wa_conversation", {
    conversation_id: unassigned!.id,
  });
  const accepted = await manager.rpc("send_wa_message", {
    conversation_id: unassigned!.id,
    text: "Ya tomada",
  });
  expect(accepted.error).toBeNull();
});
