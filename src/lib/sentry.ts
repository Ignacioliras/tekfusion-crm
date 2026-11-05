import * as Sentry from "@sentry/react";

// Strips anything that could identify a person or a session before an event
// leaves the browser: no customer data goes to third parties (CLAUDE.md rule 5).
export const scrubEvent = <T extends Sentry.Event>(event: T): T => {
  const request = event.request
    ? { ...event.request, cookies: undefined, headers: undefined }
    : undefined;
  const user = event.user
    ? { ...event.user, email: undefined, ip_address: undefined }
    : undefined;
  return { ...event, request, user };
};

/**
 * Starts Sentry only when a DSN is configured (set in the cloud, empty in
 * local and in the repo). Returns whether it was initialized.
 */
export const initSentry = (
  dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN,
): boolean => {
  if (!dsn?.trim()) return false;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Sentry v11 replaced `sendDefaultPii: false` with `dataCollection`.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
    },
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
  return true;
};
