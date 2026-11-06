import { describe, it, expect } from "vitest";
import { createHandler, type Rpc } from "./handler";

const SECRET = "secreto-de-prueba-123"; // gitleaks:allow (dato de prueba, no es un secreto)

interface Call {
  name: string;
  args: Record<string, unknown>;
}

const setup = ({
  secret = SECRET,
  result,
}: { secret?: string; result?: Rpc } = {}) => {
  const calls: Call[] = [];
  const logs: unknown[][] = [];
  const handler = createHandler({
    secret,
    rpc: async (name, args) => {
      calls.push({ name, args });
      return result ? result(name, args) : { error: null };
    },
    log: (...entry) => logs.push(entry),
  });
  return { handler, calls, logs };
};

const post = (body: unknown, apikey: string | null = SECRET): Request =>
  new Request("http://localhost/whatsapp-webhook", {
    method: "POST",
    headers: apikey === null ? {} : { apikey },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const upsert = (key: Record<string, unknown> = {}) => ({
  event: "messages.upsert",
  instance: "tekfusion-staging",
  data: {
    key: {
      id: "3EB0FICTICIO0001",
      remoteJid: "56912345678@s.whatsapp.net",
      fromMe: false,
      ...key,
    },
    messageTimestamp: 1730600000,
    message: { imageMessage: { mimetype: "image/jpeg", caption: "foto" } },
  },
});

describe("whatsapp-webhook handler", () => {
  it("answers 405 to anything but POST", async () => {
    const { handler, calls } = setup();

    const res = await handler(
      new Request("http://localhost/", { method: "GET" }),
    );

    expect(res.status).toBe(405);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["missing apikey header", null, SECRET],
    ["wrong apikey header", "otra-clave", SECRET],
    ["empty configured secret", "", ""],
  ])("answers 401 without detail on %s", async (_, apikey, secret) => {
    const { handler, calls } = setup({ secret });

    const res = await handler(post(upsert(), apikey));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(calls).toHaveLength(0);
  });

  it("ingests an incoming message with mapped type and the raw body as payload", async () => {
    const { handler, calls } = setup();
    const body = upsert();

    const res = await handler(post(body));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        name: "wa_ingest_message",
        args: {
          p_instance: "tekfusion-staging",
          p_wa_message_id: "3EB0FICTICIO0001",
          p_phone: "+56912345678",
          p_direction: "entrante",
          p_type: "imagen",
          p_text: "foto",
          p_sent_at: "2024-11-03T02:13:20.000Z",
          p_payload: body,
        },
      },
    ]);
  });

  it("marks a fromMe message as outgoing", async () => {
    const { handler, calls } = setup();

    await handler(post(upsert({ fromMe: true })));

    expect(calls[0].args.p_direction).toBe("saliente");
  });

  it("ignores group messages without calling the database", async () => {
    const { handler, calls } = setup();

    const res = await handler(
      post(upsert({ remoteJid: "120363000000000000@g.us" })),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ignored: "group message" });
    expect(calls).toHaveLength(0);
  });

  it("ignores a body that is not JSON", async () => {
    const { handler, calls } = setup();

    const res = await handler(post("no es json"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ignored: "malformed body" });
    expect(calls).toHaveLength(0);
  });

  it("updates the delivery status of a message", async () => {
    const { handler, calls } = setup();

    const res = await handler(
      post({
        event: "messages.update",
        instance: "tekfusion-staging",
        data: { keyId: "3EB0FICTICIO0001", status: "READ" },
      }),
    );

    expect(res.status).toBe(200);
    expect(calls).toEqual([
      {
        name: "wa_update_message_status",
        args: { p_wa_message_id: "3EB0FICTICIO0001", p_status: "leido" },
      },
    ]);
  });

  it("upserts the instance connection state with the raw event", async () => {
    const { handler, calls } = setup();
    const body = {
      event: "connection.update",
      instance: "tekfusion-staging",
      data: { state: "close" },
    };

    const res = await handler(post(body));

    expect(res.status).toBe(200);
    expect(calls).toEqual([
      {
        name: "wa_upsert_instance_status",
        args: {
          p_instance: "tekfusion-staging",
          p_connected: false,
          p_event: body,
        },
      },
    ]);
  });

  it("answers 200 ok:false and logs when the rpc returns an error", async () => {
    const dbError = { message: "violates check constraint" };
    const { handler, logs } = setup({
      result: async () => ({ error: dbError }),
    });

    const res = await handler(post(upsert()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false });
    expect(logs).toEqual([
      ["whatsapp-webhook: wa_ingest_message failed", dbError],
    ]);
  });

  it("answers 200 ok:false and logs when the rpc throws", async () => {
    const { handler, logs } = setup({
      result: async () => {
        throw new Error("network down");
      },
    });

    const res = await handler(post(upsert()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false });
    expect(logs).toHaveLength(1);
  });
});
