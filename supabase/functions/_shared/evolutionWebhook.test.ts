import { describe, it, expect } from "vitest";
import {
  dedupeKey,
  isAuthorized,
  parseEvolutionEvent,
  type EvolutionMessage,
} from "./evolutionWebhook";

const SECRET = "secreto-de-prueba-123";

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
  parseEvolutionEvent(body) as EvolutionMessage;

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

  it("ignores events that are not MESSAGES_UPSERT", () => {
    expect(
      parseEvolutionEvent({
        event: "connection.update",
        instance: "x",
        data: { state: "open" },
      }),
    ).toMatchObject({ ignore: true });
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

describe("dedupeKey", () => {
  it("returns the wa_message_id, so a retried webhook maps to the same key", () => {
    const body = upsert({ conversation: "hola" });
    expect(dedupeKey(parseMessage(body))).toBe("3EB0FICTICIO0001");
    expect(dedupeKey(parseMessage(structuredClone(body)))).toBe(
      dedupeKey(parseMessage(body)),
    );
  });
});
