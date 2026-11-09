// WhatsApp receiver: Evolution webhook -> Postgres RPC (docs/07, "Receptor").
// Kept free of Deno/Supabase globals so it can be tested with a fake rpc.
import {
  isAuthorized,
  parseEvolutionEvent,
  type EvolutionMessageType,
} from "../_shared/evolutionWebhook.ts";

export type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ error: unknown }>;

export type Log = (message: string, detail?: unknown) => void;

/** Sends a caught error to Sentry (reportError in _shared/sentry.ts). */
export type Report = (
  error: unknown,
  context?: Record<string, unknown>,
) => Promise<void>;

export interface HandlerDeps {
  secret: string;
  rpc: Rpc;
  log: Log;
  report?: Report;
}

const WA_MESSAGE_TYPE: Record<EvolutionMessageType, string> = {
  text: "texto",
  image: "imagen",
  document: "documento",
  audio: "audio",
  other: "otro",
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const readBody = async (req: Request): Promise<unknown> => {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
};

// A message dated further ahead than this is rejected: its date would keep the
// conversation on top of the inbox (last_message_at) for good.
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

/** Not a date Postgres can store (seconds too large) or too far in the future. */
const isOutOfRange = (date: Date): boolean => {
  const ms = date.getTime();
  return Number.isNaN(ms) || ms > Date.now() + MAX_FUTURE_MS;
};

const toRpcCall = (
  body: unknown,
):
  | { name: string; args: Record<string, unknown> }
  | { ignored: string }
  | { invalid: string } => {
  const evt = parseEvolutionEvent(body);
  if ("ignore" in evt) return { ignored: evt.reason };
  switch (evt.kind) {
    case "message":
      if (isOutOfRange(evt.timestamp)) {
        return { invalid: "messageTimestamp out of range" };
      }
      // TODO(docs/07): download attachments from Evolution into Storage
      // (adjuntos-whatsapp/<conversation>/<id>.<ext>) and fill attachment_path.
      // TODO(docs/06 flujo 02): new inbound conversation without lead -> flow 02.
      return {
        name: "wa_ingest_message",
        args: {
          p_instance: evt.instance,
          p_wa_message_id: evt.waMessageId,
          p_phone: evt.phone,
          p_direction: evt.fromMe ? "saliente" : "entrante",
          p_type: WA_MESSAGE_TYPE[evt.type],
          p_text: evt.text,
          p_sent_at: evt.timestamp.toISOString(),
          p_payload: body,
        },
      };
    case "status":
      return {
        name: "wa_update_message_status",
        args: { p_wa_message_id: evt.waMessageId, p_status: evt.status },
      };
    case "connection":
      return {
        name: "wa_upsert_instance_status",
        args: {
          p_instance: evt.instance,
          p_connected: evt.connected,
          p_event: body,
        },
      };
  }
};

/**
 * Once authorized: 200 for what was stored, already existed or is ignored;
 * 400 for a message whose timestamp is out of range (Evolution does not retry
 * a 400); 503 when the database fails, so Evolution retries. Retrying is safe:
 * wa_message_id is unique and the ingest changes nothing the second time.
 */
export const createHandler =
  ({ secret, rpc, log, report = async () => {} }: HandlerDeps) =>
  async (req: Request): Promise<Response> => {
    if (req.method !== "POST")
      return json({ error: "method_not_allowed" }, 405);
    if (!isAuthorized(req.headers, secret)) {
      return json({ error: "unauthorized" }, 401);
    }

    const call = toRpcCall(await readBody(req));
    if ("ignored" in call) return json({ ok: true, ignored: call.ignored });
    if ("invalid" in call) return json({ ok: false, error: call.invalid }, 400);

    try {
      const { error } = await rpc(call.name, call.args);
      if (error) {
        log(`whatsapp-webhook: ${call.name} failed`, error);
        await report(error, { rpc: call.name });
        return json({ ok: false }, 503);
      }
    } catch (error) {
      log(`whatsapp-webhook: ${call.name} threw`, error);
      await report(error, { rpc: call.name });
      return json({ ok: false }, 503);
    }
    return json({ ok: true });
  };
