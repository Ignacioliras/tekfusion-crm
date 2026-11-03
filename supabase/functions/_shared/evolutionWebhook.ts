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

/** Validates a MESSAGES_UPSERT event and normalizes it, or says why it is ignored. */
export const parseEvolutionEvent = (
  body: unknown,
): EvolutionMessage | IgnoredEvent => {
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) return ignore("malformed body");
  // Body uses "messages.upsert"; accept the config spelling "MESSAGES_UPSERT" too.
  const event = envelope.data.event.toLowerCase().replace("_", ".");
  if (event !== "messages.upsert") {
    return ignore(`unhandled event ${envelope.data.event}`);
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    return ignore(`malformed ${issue.path.join(".") || "body"}`);
  }
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

/** Key of the UNIQUE constraint on messages (wa_message_id, docs/05). */
export const dedupeKey = (evt: EvolutionMessage): string => evt.waMessageId;
