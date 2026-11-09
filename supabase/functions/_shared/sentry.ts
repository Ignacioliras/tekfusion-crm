type Handler = (req: Request) => Response | Promise<Response>;

interface SentryLike {
  captureException: (
    error: unknown,
    hint?: { extra?: Record<string, unknown> },
  ) => unknown;
  flush: (timeout?: number) => Promise<boolean>;
}

const FLUSH_TIMEOUT_MS = 2000;

// Patterns applied in this order: a Bearer value is often a JWT and a header
// value may hold an email, so tokens go first and phones last.
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;
const KEY_VALUE =
  /\b(apikey|api[_-]?key|token|secret|password)(["']?\s*[:=]\s*["']?)[^\s"',;&}]+/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// E.164 (+56912345678) and Chilean numbers, spaced or not: 9 digits starting
// with 9 (mobile) or 2 (Santiago landline), optionally preceded by (+)56.
const PHONE = /\+\d{8,15}\b|\+?\b(?:56\s?)?[29](?:\s?\d){8}\b/g;
// Keys whose value is a secret whatever it looks like (headers included).
const SENSITIVE_KEY =
  /^(authorization|apikey|api[_-]?key|x-api-key|cookie|set-cookie|token|secret|password)$/i;

const scrubText = (text: string): string =>
  text
    .replace(JWT, "[token]")
    .replace(BEARER, "Bearer [token]")
    .replace(KEY_VALUE, "$1$2[token]")
    .replace(EMAIL, "[email]")
    .replace(PHONE, "[phone]");

// Sentry normalizes the event (depth-limited, no cycles) before beforeSend,
// so a plain recursion is enough.
const scrubValue = (value: unknown, key?: string): unknown => {
  if (typeof value === "string") {
    return key && SENSITIVE_KEY.test(key) ? "[token]" : scrubText(value);
  }
  if (Array.isArray(value)) return value.map((item) => scrubValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, scrubValue(v, k)]),
    );
  }
  return value;
};

/**
 * Removes emails, phones and tokens from every string of the event (message,
 * exception, extra, contexts, request and its headers) before it leaves the
 * function: no customer data to third parties (CLAUDE.md rule 5). Pure:
 * returns a new event, the input is not touched.
 */
export const scrubEvent = <T extends object>(event: T): T =>
  scrubValue(event) as T;

// Deno is missing in vitest (Node): then there is no DSN and Sentry is a no-op.
const env = (key: string): string | undefined =>
  typeof Deno === "undefined" ? undefined : Deno.env.get(key);

let sentryPromise: Promise<SentryLike | null> | undefined;

// Loads and starts @sentry/deno only when SENTRY_DSN is set (only in the
// cloud): without it, nothing is imported and nothing leaves the function.
const loadSentry = (): Promise<SentryLike | null> => {
  if (sentryPromise) return sentryPromise;
  const dsn = env("SENTRY_DSN")?.trim();
  sentryPromise = dsn
    ? import("npm:@sentry/deno@11.10.0")
        .then((Sentry) => {
          Sentry.init({
            dsn,
            environment: env("SENTRY_ENVIRONMENT") ?? "production",
            tracesSampleRate: 0,
            // No customer data to third parties (CLAUDE.md rule 5).
            dataCollection: {
              userInfo: false,
              cookies: false,
              httpHeaders: false,
              httpBodies: [],
            },
            defaultIntegrations: false,
            beforeSend: scrubEvent,
          });
          return Sentry as SentryLike;
        })
        .catch((error) => {
          console.error("Sentry could not be loaded:", error);
          return null;
        })
    : Promise.resolve(null);
  return sentryPromise;
};

/**
 * Sends a caught error to Sentry (with `context` as extra, scrubbed like the
 * rest) and waits for the flush. Never throws; without DSN it does nothing.
 * Pass only technical context (function, step, rpc name), never user data.
 */
export const reportError = async (
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> => {
  const sentry = await loadSentry();
  if (!sentry) return;
  try {
    sentry.captureException(error, context ? { extra: context } : undefined);
    await sentry.flush(FLUSH_TIMEOUT_MS);
  } catch (reportFailure) {
    console.error("Sentry report failed:", reportFailure);
  }
};

/**
 * Reports to Sentry the exceptions the handler lets escape, then rethrows
 * them so the runtime answers the same 500 as before. Errors the handler
 * catches itself go through reportError.
 */
export const withSentry =
  (handler: Handler): Handler =>
  async (req) => {
    try {
      return await handler(req);
    } catch (error) {
      await reportError(error);
      throw error;
    }
  };
