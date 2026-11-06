// Pure helpers for the WhatsApp receiver (docs/07-whatsapp-evolution.md).
// No database, no network: the Edge Function wires these to Supabase.
//
// Assumed Evolution API v2 webhook payload for an incoming/outgoing message
// (MESSAGES_UPSERT; the body carries it as "messages.upsert"):
//
//   {
//     "event": "messages.upsert",
//     "instance": "tekfusion",
//     "data": {
//       "key": { "id": "3EB0...", "remoteJid": "56912345678@s.whatsapp.net", "fromMe": false },
//       "messageTimestamp": 1730600000,            // unix seconds, number or numeric string
//       "message": {
//         "conversation": "hola"                   // plain text, or
//         "extendedTextMessage": { "text": "..." } // text with link preview/quote, or
//         "imageMessage" | "documentMessage" | "audioMessage": { "mimetype": "...", "caption"?: "..." }
//       }
//     }
//   }
//
// remoteJid is "<digits>@s.whatsapp.net" for a person and "<id>@g.us" for a group.
// Any other key inside `message` (sticker, reaction, location...) becomes type "other".
//
// Assumed delivery receipt (MESSAGES_UPDATE / "messages.update"); the message id
// comes in `keyId` or in `key.id`:
//
//   { "event": "messages.update", "instance": "tekfusion",
//     "data": { "keyId": "3EB0...", "status": "DELIVERY_ACK" } }
//
// status: PENDING | SERVER_ACK | DELIVERY_ACK | READ | PLAYED | ERROR, mapped to
// delivery_status (READ and PLAYED are both "leido"). Any other status is ignored.
//
// Assumed connection change (CONNECTION_UPDATE / "connection.update"):
//
//   { "event": "connection.update", "instance": "tekfusion",
//     "data": { "state": "open" } }   // "open" | "close" | "connecting"
//
// Only "open" means connected; any other state value is ignored.

import { z } from "npm:zod@^4.3.6";

export type EvolutionMessageType =
  "text" | "image" | "document" | "audio" | "other";

export interface EvolutionMessage {
  instance: string;
  waMessageId: string;
  remoteJid: string;
  phone: string;
  isGroup: false;
  fromMe: boolean;
  timestamp: Date;
  type: EvolutionMessageType;
  text: string | null;
  mediaMimeType: string | null;
}

export interface IgnoredEvent {
  ignore: true;
  reason: string;
  isGroup?: true;
}

export type DeliveryStatus =
  "pendiente" | "enviado" | "entregado" | "leido" | "fallido";

export type ConnectionState = "open" | "close" | "connecting";

export type EvolutionMessageEvent = { kind: "message" } & EvolutionMessage;

export interface EvolutionStatusEvent {
  kind: "status";
  instance: string;
  waMessageId: string;
  status: DeliveryStatus;
}

export interface EvolutionConnectionEvent {
  kind: "connection";
  instance: string;
  connected: boolean;
  state: ConnectionState;
}

export type EvolutionEvent =
  | EvolutionMessageEvent
  | EvolutionStatusEvent
  | EvolutionConnectionEvent
  | IgnoredEvent;

const DELIVERY_STATUS: Record<string, DeliveryStatus> = {
  PENDING: "pendiente",
  SERVER_ACK: "enviado",
  DELIVERY_ACK: "entregado",
  READ: "leido",
  PLAYED: "leido",
  ERROR: "fallido",
};

const PERSON_JID_SUFFIX = "@s.whatsapp.net";
const GROUP_JID_SUFFIX = "@g.us";
const E164_DIGITS = /^[1-9]\d{7,14}$/;
const MEDIA_TYPES = {
  imageMessage: "image",
  documentMessage: "document",
  audioMessage: "audio",
} as const;

/** Compares the `apikey` header with the secret in constant time. */
export const isAuthorized = (headers: Headers, secret: string): boolean => {
  const provided = headers.get("apikey");
  if (!secret || provided === null) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
};

const envelopeSchema = z.object({ event: z.string() });

// Unix seconds, as a number or a numeric string.
const timestampSchema = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().positive())
  .transform((seconds) => new Date(seconds * 1000));

const upsertSchema = z.object({
  instance: z.string(),
  data: z.object({
    key: z.object({
      id: z.string().min(1),
      remoteJid: z.string(),
      fromMe: z.boolean(),
    }),
    messageTimestamp: timestampSchema,
    message: z.looseObject({}),
  }),
});

const extendedTextSchema = z.object({ text: z.string() });

// Caption and mimetype are optional metadata: a wrong type becomes null
// instead of rejecting the whole message.
const mediaSchema = z.object({
  caption: z.string().nullable().catch(null),
  mimetype: z.string().nullable().catch(null),
});

const ignore = (reason: string): IgnoredEvent => ({ ignore: true, reason });

const readContent = (
  message: Record<string, unknown>,
): Pick<EvolutionMessage, "type" | "text" | "mediaMimeType"> => {
  if (typeof message.conversation === "string") {
    return { type: "text", text: message.conversation, mediaMimeType: null };
  }
  const extended = extendedTextSchema.safeParse(message.extendedTextMessage);
  if (extended.success) {
    return { type: "text", text: extended.data.text, mediaMimeType: null };
  }
  for (const [key, type] of Object.entries(MEDIA_TYPES)) {
    const media = mediaSchema.safeParse(message[key]);
    if (media.success) {
      return {
        type,
        text: media.data.caption,
        mediaMimeType: media.data.mimetype,
      };
    }
  }
  return { type: "other", text: null, mediaMimeType: null };
};

const statusSchema = z.object({
  instance: z.string(),
  data: z.object({
    keyId: z.string().min(1).optional(),
    key: z.object({ id: z.string().min(1).optional() }).optional(),
    status: z.string(),
  }),
});

const connectionSchema = z.object({
  instance: z.string(),
  data: z.object({ state: z.string() }),
});

const malformed = (error: z.ZodError): IgnoredEvent => {
  const [issue] = error.issues;
  return ignore(`malformed ${issue.path.join(".") || "body"}`);
};

const parseStatus = (body: unknown): EvolutionStatusEvent | IgnoredEvent => {
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return malformed(parsed.error);
  const { instance, data } = parsed.data;
  const waMessageId = data.keyId ?? data.key?.id;
  if (!waMessageId) return ignore("missing message id");
  if (!Object.hasOwn(DELIVERY_STATUS, data.status)) {
    return ignore(`unknown status ${data.status}`);
  }
  return {
    kind: "status",
    instance,
    waMessageId,
    status: DELIVERY_STATUS[data.status],
  };
};

const parseConnection = (
  body: unknown,
): EvolutionConnectionEvent | IgnoredEvent => {
  const parsed = connectionSchema.safeParse(body);
  if (!parsed.success) return malformed(parsed.error);
  const { instance, data } = parsed.data;
  const { state } = data;
  if (state !== "open" && state !== "close" && state !== "connecting") {
    return ignore(`unknown connection state ${state}`);
  }
  return { kind: "connection", instance, connected: state === "open", state };
};

const parseUpsert = (body: unknown): EvolutionMessageEvent | IgnoredEvent => {
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return malformed(parsed.error);
  const { instance, data } = parsed.data;
  const { id, remoteJid, fromMe } = data.key;
  if (remoteJid.endsWith(GROUP_JID_SUFFIX)) {
    return { ignore: true, reason: "group message", isGroup: true };
  }
  const digits = remoteJid.endsWith(PERSON_JID_SUFFIX)
    ? remoteJid.slice(0, -PERSON_JID_SUFFIX.length)
    : "";
  if (!E164_DIGITS.test(digits)) return ignore("unsupported remoteJid");

  return {
    kind: "message",
    instance,
    waMessageId: id,
    remoteJid,
    phone: `+${digits}`,
    isGroup: false,
    fromMe,
    timestamp: data.messageTimestamp,
    ...readContent(data.message),
  };
};

/** Validates an event and normalizes it, or says why it is ignored. */
export const parseEvolutionEvent = (body: unknown): EvolutionEvent => {
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) return ignore("malformed body");
  // Body uses "messages.upsert"; accept the config spelling "MESSAGES_UPSERT" too
  // (every underscore, not just the first).
  const event = envelope.data.event.toLowerCase().replace(/_/g, ".");
  switch (event) {
    case "messages.upsert":
      return parseUpsert(body);
    case "messages.update":
      return parseStatus(body);
    case "connection.update":
      return parseConnection(body);
    default:
      return ignore(`unhandled event ${envelope.data.event}`);
  }
};

/** Key of the UNIQUE constraint on messages (wa_message_id, docs/05). */
export const dedupeKey = (evt: EvolutionMessage): string => evt.waMessageId;
