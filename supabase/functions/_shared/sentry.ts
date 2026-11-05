type Handler = (req: Request) => Response | Promise<Response>;

interface SentryLike {
  captureException: (error: unknown) => unknown;
  flush: (timeout?: number) => Promise<boolean>;
}

const FLUSH_TIMEOUT_MS = 2000;

let sentryPromise: Promise<SentryLike | null> | undefined;

// Loads and starts @sentry/deno only when SENTRY_DSN is set (only in the
// cloud): without it, nothing is imported and nothing leaves the function.
const loadSentry = (): Promise<SentryLike | null> => {
  if (sentryPromise) return sentryPromise;
  const dsn = Deno.env.get("SENTRY_DSN")?.trim();
  sentryPromise = dsn
    ? import("npm:@sentry/deno")
        .then((Sentry) => {
          Sentry.init({
            dsn,
            environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
            tracesSampleRate: 0,
            // No customer data to third parties (CLAUDE.md rule 5).
            dataCollection: {
              userInfo: false,
              cookies: false,
              httpHeaders: false,
              httpBodies: [],
            },
            defaultIntegrations: false,
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
 * Reports to Sentry the exceptions the handler lets escape, then rethrows
 * them so the runtime answers the same 500 as before. Errors the handler
 * catches itself are not touched.
 */
export const withSentry =
  (handler: Handler): Handler =>
  async (req) => {
    try {
      return await handler(req);
    } catch (error) {
      const sentry = await loadSentry();
      if (sentry) {
        sentry.captureException(error);
        await sentry.flush(FLUSH_TIMEOUT_MS);
      }
      throw error;
    }
  };
