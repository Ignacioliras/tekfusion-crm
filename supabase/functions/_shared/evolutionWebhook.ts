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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const ignore = (reason: string): IgnoredEvent => ({ ignore: true, reason });

const parseTimestamp = (value: unknown): Date | null => {
  const seconds =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds <= 0)
    return null;
  return new Date(seconds * 1000);
};

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readContent = (
  message: Record<string, unknown>,
): Pick<EvolutionMessage, "type" | "text" | "mediaMimeType"> => {
  if (typeof message.conversation === "string") {
    return { type: "text", text: message.conversation, mediaMimeType: null };
  }
  const extended = message.extendedTextMessage;
  if (isRecord(extended) && typeof extended.text === "string") {
    return { type: "text", text: extended.text, mediaMimeType: null };
  }
  for (const [key, type] of Object.entries(MEDIA_TYPES)) {
    const media = message[key];
    if (isRecord(media)) {
      return {
        type,
        text: stringOrNull(media.caption),
        mediaMimeType: stringOrNull(media.mimetype),
      };
    }
  }
  return { type: "other", text: null, mediaMimeType: null };
};

/** Validates a MESSAGES_UPSERT event and normalizes it, or says why it is ignored. */
export const parseEvolutionEvent = (
  body: unknown,
): EvolutionMessage | IgnoredEvent => {
  if (!isRecord(body) || typeof body.event !== "string") {
    return ignore("malformed body");
  }
  // Body uses "messages.upsert"; accept the config spelling "MESSAGES_UPSERT" too.
  const event = body.event.toLowerCase().replace("_", ".");
  if (event !== "messages.upsert")
    return ignore(`unhandled event ${body.event}`);

  const { instance, data } = body;
  if (typeof instance !== "string" || !isRecord(data) || !isRecord(data.key)) {
    return ignore("malformed body");
  }
  const { id, remoteJid, fromMe } = data.key;
  if (
    typeof id !== "string" ||
    !id ||
    typeof remoteJid !== "string" ||
    typeof fromMe !== "boolean"
  ) {
    return ignore("malformed message key");
  }
  if (remoteJid.endsWith(GROUP_JID_SUFFIX)) {
    return { ignore: true, reason: "group message", isGroup: true };
  }
  const digits = remoteJid.endsWith(PERSON_JID_SUFFIX)
    ? remoteJid.slice(0, -PERSON_JID_SUFFIX.length)
    : "";
  if (!E164_DIGITS.test(digits)) return ignore("unsupported remoteJid");

  const timestamp = parseTimestamp(data.messageTimestamp);
  if (!timestamp) return ignore("malformed messageTimestamp");
  if (!isRecord(data.message)) return ignore("missing message content");

  return {
    instance,
    waMessageId: id,
    remoteJid,
    phone: `+${digits}`,
    isGroup: false,
    fromMe,
    timestamp,
    ...readContent(data.message),
  };
};

/** Key of the UNIQUE constraint on messages (wa_message_id, docs/05). */
export const dedupeKey = (evt: EvolutionMessage): string => evt.waMessageId;
