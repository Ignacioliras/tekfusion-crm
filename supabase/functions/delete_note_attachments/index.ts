import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getUnreferencedNames } from "../_shared/attachmentRefs.ts";
import { AuthMiddleware } from "../_shared/authentication.ts";
import { reportError, withSentry } from "../_shared/sentry.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getCandidateNames, type WebhookPayload } from "./candidateNames.ts";

const ATTACHMENTS_BUCKET =
  Deno.env.get("VITE_ATTACHMENTS_BUCKET") || "attachments";

// The note triggers call this function when a note is updated or deleted,
// sending the note as it was before the change.
//
// Any logged-in user can call this endpoint with a made-up payload, so the
// payload is not trusted: its attachments are only files we *may* delete.
// Each of them is deleted only if no row of the database still uses it.
// At worst, a caller can delete files that nothing uses anymore.
const deleteNoteAttachments = async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const candidates = getCandidateNames(payload);
  if (candidates.length === 0) {
    return jsonResponse({ status: "skipped", reason: "no_candidate_files" });
  }

  let paths: string[];
  try {
    paths = await getUnreferencedNames(candidates);
  } catch (error) {
    console.error("Failed to check note attachment references", { error });
    await reportError(error, { function: "delete_note_attachments" });
    return jsonResponse(
      { error: "Failed to check note attachment references" },
      500,
    );
  }

  if (paths.length === 0) {
    return jsonResponse({ status: "skipped", reason: "still_referenced" });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .remove(paths);

  if (error) {
    console.error("Failed to delete note attachments", { paths, error });
    await reportError(error, { function: "delete_note_attachments" });
    return jsonResponse({ error: "Failed to delete note attachments" }, 500);
  }

  return jsonResponse({ status: "ok", deleted: data.length });
};

Deno.serve(
  withSentry(async (req: Request) =>
    AuthMiddleware(req, async (req: Request) => deleteNoteAttachments(req)),
  ),
);

// The reference check (getUnreferencedNames, _shared/attachmentRefs.ts) runs
// after the note change is saved, so the edited note is checked with its new
// attachments: a file the note still has is kept.

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
