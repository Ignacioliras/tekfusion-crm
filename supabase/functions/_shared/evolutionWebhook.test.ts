import { describe, it, expect } from "vitest";
import {
  dedupeKey,
  isAuthorized,
  parseEvolutionEvent,
  type EvolutionMessageEvent,
} from "./evolutionWebhook";

const SECRET = "secreto-de-prueba-123"; // gitleaks:allow (dato de prueba, no es un secreto)

const upsert = (
  message: Record<string, unknown>,
  key: Record<string, unknown> = {},
) => ({
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
    message,
  },
});

const parseMessage = (body: unknown) =>
  parseEvolutionEvent(body) as EvolutionMessageEvent;

const statusUpdate = (
  data: Record<string, unknown>,
  event = "messages.update",
) => ({
  event,
  instance: "tekfusion-staging",
  data,
});

const connectionUpdate = (state: unknown, event = "connection.update") => ({
  event,
  instance: "tekfusion-staging",
  data: { state },
});

describe("isAuthorized", () => {
  it("accepts the correct apikey", () => {
    expect(isAuthorized(new Headers({ apikey: SECRET }), SECRET)).toBe(true);
  });

  it("rejects a wrong apikey, including one sharing the prefix", () => {
    expect(isAuthorized(new Headers({ apikey: "otra" }), SECRET)).toBe(false);
    expect(isAuthorized(new Headers({ apikey: `${SECRET}x` }), SECRET)).toBe(
      false,
    );
  });

  it("rejects a missing apikey or an empty secret", () => {
    expect(isAuthorized(new Headers(), SECRET)).toBe(false);
    expect(isAuthorized(new Headers({ apikey: "" }), "")).toBe(false);
  });
});

describe("parseEvolutionEvent", () => {
  it("normalizes a plain text message", () => {
    expect(
      parseEvolutionEvent(upsert({ conversation: "Hola, cotizo válvulas" })),
    ).toEqual({
      kind: "message",
      instance: "tekfusion-staging",
      waMessageId: "3EB0FICTICIO0001",
      remoteJid: "56912345678@s.whatsapp.net",
      phone: "+56912345678",
      isGroup: false,
      fromMe: false,
      timestamp: new Date(1730600000 * 1000),
      type: "text",
      text: "Hola, cotizo válvulas",
      mediaMimeType: null,
    });
  });

  it("reads the text of an extendedTextMessage", () => {
    const evt = parseMessage(
      upsert({ extendedTextMessage: { text: "Ver https://ejemplo.cl" } }),
    );
    expect(evt.type).toBe("text");
    expect(evt.text).toBe("Ver https://ejemplo.cl");
  });

  it("returns type, caption and mimetype of an image", () => {
    const evt = parseMessage(
      upsert({ imageMessage: { mimetype: "image/jpeg", caption: "Plano" } }),
    );
    expect(evt).toMatchObject({
      type: "image",
      text: "Plano",
      mediaMimeType: "image/jpeg",
    });
  });

  it("returns an audio without text", () => {
    const evt = parseMessage(
      upsert({ audioMessage: { mimetype: "audio/ogg; codecs=opus" } }),
    );
    expect(evt).toMatchObject({
      type: "audio",
      text: null,
      mediaMimeType: "audio/ogg; codecs=opus",
    });
  });

  it("returns a document with its mimetype", () => {
    const evt = parseMessage(
      upsert({ documentMessage: { mimetype: "application/pdf" } }),
    );
    expect(evt.type).toBe("document");
    expect(evt.mediaMimeType).toBe("application/pdf");
  });

  it("marks unknown message kinds as other", () => {
    expect(parseMessage(upsert({ stickerMessage: {} })).type).toBe("other");
  });

  it("keeps fromMe true for messages sent from our number", () => {
    expect(
      parseMessage(
        upsert({ conversation: "Le envío la cotización" }, { fromMe: true }),
      ).fromMe,
    ).toBe(true);
  });

  it("accepts the timestamp as a numeric string", () => {
    const body = upsert({ conversation: "hola" });
    const evt = parseMessage({
      ...body,
      data: { ...body.data, messageTimestamp: "1730600000" },
    });
    expect(evt.timestamp).toEqual(new Date(1730600000 * 1000));
  });

  it("accepts the MESSAGES_UPSERT spelling of the event", () => {
    const evt = parseMessage({
      ...upsert({ conversation: "hola" }),
      event: "MESSAGES_UPSERT",
    });
    expect(evt.waMessageId).toBe("3EB0FICTICIO0001");
  });

  it("ignores group messages", () => {
    expect(
      parseEvolutionEvent(
        upsert(
          { conversation: "hola grupo" },
          { remoteJid: "120363000000000000@g.us" },
        ),
      ),
    ).toEqual({ ignore: true, reason: "group message", isGroup: true });
  });

  it("ignores events it does not handle", () => {
    expect(
      parseEvolutionEvent({
        event: "qrcode.updated",
        instance: "x",
        data: { qrcode: {} },
      }),
    ).toEqual({ ignore: true, reason: "unhandled event qrcode.updated" });
  });

  it("ignores malformed bodies instead of throwing", () => {
    const valid = upsert({ conversation: "hola" });
    const malformed: unknown[] = [
      null,
      "texto",
      [],
      {},
      { ...valid, data: null },
      { ...valid, data: { ...valid.data, key: { ...valid.data.key, id: 1 } } },
      {
        ...valid,
        data: { ...valid.data, key: { ...valid.data.key, fromMe: "no" } },
      },
      { ...valid, data: { ...valid.data, messageTimestamp: "ayer" } },
      { ...valid, data: { ...valid.data, message: undefined } },
      upsert({ conversation: "hola" }, { remoteJid: "abc@s.whatsapp.net" }),
      upsert({ conversation: "hola" }, { remoteJid: "56912345678@lid" }),
    ];
    for (const body of malformed) {
      expect(parseEvolutionEvent(body)).toMatchObject({ ignore: true });
    }
  });
});

describe("parseEvolutionEvent: messages.update", () => {
  it.each([
    ["PENDING", "pendiente"],
    ["SERVER_ACK", "enviado"],
    ["DELIVERY_ACK", "entregado"],
    ["READ", "leido"],
    ["PLAYED", "leido"],
    ["ERROR", "fallido"],
  ])("maps status %s to %s", (status, expected) => {
    expect(
      parseEvolutionEvent(statusUpdate({ keyId: "3EB0FICTICIO0001", status })),
    ).toEqual({
      kind: "status",
      instance: "tekfusion-staging",
      waMessageId: "3EB0FICTICIO0001",
      status: expected,
    });
  });

  it("reads the message id from key.id when keyId is missing", () => {
    expect(
      parseEvolutionEvent(
        statusUpdate({ key: { id: "3EB0FICTICIO0002" }, status: "READ" }),
      ),
    ).toMatchObject({ kind: "status", waMessageId: "3EB0FICTICIO0002" });
  });

  it("accepts the MESSAGES_UPDATE spelling of the event", () => {
    expect(
      parseEvolutionEvent(
        statusUpdate(
          { keyId: "3EB0FICTICIO0001", status: "DELIVERY_ACK" },
          "MESSAGES_UPDATE",
        ),
      ),
    ).toMatchObject({ kind: "status", status: "entregado" });
  });

  it("ignores an update without message id", () => {
    expect(parseEvolutionEvent(statusUpdate({ status: "READ" }))).toEqual({
      ignore: true,
      reason: "missing message id",
    });
    expect(
      parseEvolutionEvent(statusUpdate({ key: {}, status: "READ" })),
    ).toMatchObject({ ignore: true });
  });

  it("ignores an unknown status, including Object prototype keys", () => {
    for (const status of ["DELETED", "read", "toString", "constructor"]) {
      expect(
        parseEvolutionEvent(
          statusUpdate({ keyId: "3EB0FICTICIO0001", status }),
        ),
      ).toEqual({ ignore: true, reason: `unknown status ${status}` });
    }
  });

  it("ignores malformed updates instead of throwing", () => {
    const malformed: unknown[] = [
      { event: "messages.update", instance: "x" },
      statusUpdate({ keyId: 1, status: "READ" }),
      statusUpdate({ keyId: "3EB0FICTICIO0001" }),
      statusUpdate({ keyId: "3EB0FICTICIO0001", status: 3 }),
    ];
    for (const body of malformed) {
      expect(parseEvolutionEvent(body)).toMatchObject({ ignore: true });
    }
  });
});

describe("parseEvolutionEvent: connection.update", () => {
  it.each([
    ["open", true],
    ["close", false],
    ["connecting", false],
  ])("maps state %s to connected %s", (state, connected) => {
    expect(parseEvolutionEvent(connectionUpdate(state))).toEqual({
      kind: "connection",
      instance: "tekfusion-staging",
      connected,
      state,
    });
  });

  it("accepts the CONNECTION_UPDATE spelling of the event", () => {
    expect(
      parseEvolutionEvent(connectionUpdate("open", "CONNECTION_UPDATE")),
    ).toMatchObject({ kind: "connection", connected: true });
  });

  it("ignores an unknown state", () => {
    expect(parseEvolutionEvent(connectionUpdate("refused"))).toEqual({
      ignore: true,
      reason: "unknown connection state refused",
    });
  });

  it("ignores malformed connection events instead of throwing", () => {
    const malformed: unknown[] = [
      connectionUpdate(undefined),
      connectionUpdate(1),
      { event: "connection.update", data: { state: "open" } },
    ];
    for (const body of malformed) {
      expect(parseEvolutionEvent(body)).toMatchObject({ ignore: true });
    }
  });
});

describe("dedupeKey", () => {
  it("returns the wa_message_id, so a retried webhook maps to the same key", () => {
    const body = upsert({ conversation: "hola" });
    expect(dedupeKey(parseMessage(body))).toBe("3EB0FICTICIO0001");
    expect(dedupeKey(parseMessage(structuredClone(body)))).toBe(
      dedupeKey(parseMessage(body)),
    );
  });
});
