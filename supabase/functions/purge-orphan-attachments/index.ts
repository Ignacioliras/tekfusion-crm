import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sql } from "https://esm.sh/kysely@0.27.2";
import { getUnreferencedNames } from "../_shared/attachmentRefs.ts";
import { db } from "../_shared/db.ts";
import { reportError, withSentry } from "../_shared/sentry.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createHandler } from "./handler.ts";

const ATTACHMENTS_BUCKET =
  Deno.env.get("VITE_ATTACHMENTS_BUCKET") || "attachments";
const REMOVE_BATCH = 100;

// Called daily by pg_cron through pg_net (migration purge_orphan_cron) with
// the service role key; the handler checks it, verify_jwt is off (config.toml).
Deno.serve(
  withSentry(
    createHandler({
      serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      // storage.objects straight from the database: the Storage list API is
      // not recursive and the function already holds a connection.
      listObjectsOlderThan: async (cutoff) => {
        const { rows } = await sql<{ name: string }>`
          select name from storage.objects
          where bucket_id = ${ATTACHMENTS_BUCKET}
            and created_at < ${cutoff.toISOString()}::timestamptz
          order by name
        `.execute(db);
        return rows.map((row) => row.name);
      },
      getUnreferencedNames,
      removeObjects: async (names) => {
        for (let i = 0; i < names.length; i += REMOVE_BATCH) {
          const { error } = await supabaseAdmin.storage
            .from(ATTACHMENTS_BUCKET)
            .remove(names.slice(i, i + REMOVE_BATCH));
          if (error) throw error;
        }
      },
      log: (message, detail) => console.error(message, detail),
      report: reportError,
    }),
  ),
);
