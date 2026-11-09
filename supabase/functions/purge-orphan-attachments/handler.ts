// Daily purge of orphan files in the attachments bucket (docs/08). Kept free
// of Deno/Supabase globals so it can be tested with fake dependencies.
import { z } from "npm:zod@^4.3.6";

export type Log = (message: string, detail?: unknown) => void;

/** Sends a caught error to Sentry (reportError in _shared/sentry.ts). */
export type Report = (
  error: unknown,
  context?: Record<string, unknown>,
) => Promise<void>;

export interface PurgeDeps {
  /** SUPABASE_SERVICE_ROLE_KEY. Empty: every request is rejected (401). */
  serviceRoleKey: string;
  /** Names of the bucket objects created before `cutoff`. */
  listObjectsOlderThan: (cutoff: Date) => Promise<string[]>;
  /** Among `names`, the ones no row references (_shared/attachmentRefs.ts). */
  getUnreferencedNames: (names: string[]) => Promise<string[]>;
  /** Deletes the files from the bucket; throws when it fails. */
  removeObjects: (names: string[]) => Promise<void>;
  log: Log;
  report?: Report;
  now?: () => Date;
}

/** A file younger than this is never touched: its note may still be saving. */
export const MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Only note attachments are purged: deals/<id>/<random>.<ext> and
// contacts/<id>/<random>.<ext>. Logos (companies/, config/) and avatars
// (sales/) never become candidates, referenced or not.
const PURGEABLE = /^(deals|contacts)\/[0-9]+\/0\.[0-9]+[^/]*$/;

const bodySchema = z.strictObject({ apply: z.boolean().optional() });

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Empty body = dry run. Anything else must be JSON matching bodySchema.
const readBody = async (req: Request): Promise<unknown> => {
  const text = await req.text();
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const timingSafeEqual = (a: string, b: string): boolean => {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
};

/** `Authorization: Bearer <service role key>` and nothing else. */
const isServiceRole = (headers: Headers, serviceRoleKey: string): boolean => {
  const provided = headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!serviceRoleKey || !provided) return false;
  return timingSafeEqual(provided, serviceRoleKey);
};

/**
 * POST with the service role key. Dry run by default: counts the orphans
 * (older than 24 h, under deals/ or contacts/, referenced by no row) without
 * deleting. `{"apply": true}` deletes them. Answers {candidatos, borrados}.
 */
export const createHandler =
  ({
    serviceRoleKey,
    listObjectsOlderThan,
    getUnreferencedNames,
    removeObjects,
    log,
    report = async () => {},
    now = () => new Date(),
  }: PurgeDeps) =>
  async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }
    if (!isServiceRole(req.headers, serviceRoleKey)) {
      return json({ error: "unauthorized" }, 401);
    }
    const body = bodySchema.safeParse(await readBody(req));
    if (!body.success) return json({ error: "invalid_body" }, 400);
    const apply = body.data.apply === true;

    try {
      const cutoff = new Date(now().getTime() - MIN_AGE_MS);
      const candidates = new Set(
        (await listObjectsOlderThan(cutoff)).filter((name) =>
          PURGEABLE.test(name),
        ),
      );
      // Re-checked against the candidates: whatever the query answers, a file
      // outside the purgeable folders is never deleted.
      const orphans =
        candidates.size === 0
          ? []
          : (await getUnreferencedNames([...candidates])).filter((name) =>
              candidates.has(name),
            );
      if (apply && orphans.length > 0) await removeObjects(orphans);
      return json({
        candidatos: orphans.length,
        borrados: apply ? orphans.length : 0,
      });
    } catch (error) {
      log("purge-orphan-attachments failed", error);
      await report(error, { function: "purge-orphan-attachments", apply });
      return json({ error: "purge_failed" }, 500);
    }
  };
