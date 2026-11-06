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

export interface HandlerDeps {
  secret: string;
  rpc: Rpc;
  log: Log;
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

const toRpcCall = (
  body: unknown,
): { name: string; args: Record<string, unknown> } | { ignored: string } => {
  const evt = parseEvolutionEvent(body);
  if ("ignore" in evt) return { ignored: evt.reason };
  switch (evt.kind) {
    case "message":
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
 * Always answers 200 once authorized (errors included, as {ok:false}) so
 * Evolution does not retry forever; reconciliation (flow 10) recovers gaps.
 */
export const createHandler =
  ({ secret, rpc, log }: HandlerDeps) =>
  async (req: Request): Promise<Response> => {
    if (req.method !== "POST")
      return json({ error: "method_not_allowed" }, 405);
    if (!isAuthorized(req.headers, secret)) {
      return json({ error: "unauthorized" }, 401);
    }

    const call = toRpcCall(await readBody(req));
    if ("ignored" in call) return json({ ok: true, ignored: call.ignored });

    try {
      const { error } = await rpc(call.name, call.args);
      if (error) {
        log(`whatsapp-webhook: ${call.name} failed`, error);
        return json({ ok: false });
      }
    } catch (error) {
      log(`whatsapp-webhook: ${call.name} threw`, error);
      return json({ ok: false });
    }
    return json({ ok: true });
  };
