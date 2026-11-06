import { withSentry } from "../_shared/sentry.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createHandler } from "./handler.ts";

// Empty or missing secret: isAuthorized rejects every request (401).
const secret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET") ?? "";

Deno.serve(
  withSentry(
    createHandler({
      secret,
      rpc: async (name, args) => {
        const { error } = await supabaseAdmin.rpc(name, args);
        return { error };
      },
      log: (message, detail) => console.error(message, detail),
    }),
  ),
);
