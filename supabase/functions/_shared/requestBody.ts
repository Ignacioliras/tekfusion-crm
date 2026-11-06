import type { z } from "npm:zod@^4.3.6";
import { createErrorResponse } from "./utils.ts";

export type ParsedBody<T> = { data: T } | { response: Response };

const invalidBody = (field: string): { response: Response } => ({
  response: createErrorResponse(400, `Invalid request body: ${field}`, {
    code: "invalid_body",
    field,
  }),
});

/**
 * Reads the JSON body and validates it against `schema`. On failure returns a
 * 400 naming the field that failed, never the value received (docs/08).
 */
export async function parseJsonBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<ParsedBody<z.output<S>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidBody("body");
  }
  const parsed = schema.safeParse(body);
  if (parsed.success) return { data: parsed.data };
  const [issue] = parsed.error.issues;
  const field =
    issue.code === "unrecognized_keys"
      ? issue.keys.join(", ")
      : issue.path.join(".") || "body";
  return invalidBody(field);
}
