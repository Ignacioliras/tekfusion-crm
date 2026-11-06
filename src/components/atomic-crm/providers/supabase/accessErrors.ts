// Who is let through and who is not, read from an API error: a lost session
// sends the user to the login page; a refused action (RLS, 42501) only shows
// an error and leaves the session alone.

type ApiError = {
  status?: number;
  name?: string;
  code?: string;
  body?: { code?: string } | null;
};

const asApiError = (error: unknown): ApiError =>
  typeof error === "object" && error !== null ? error : {};

/** Supabase Auth answers 403 with these codes when the session itself is gone. */
const AUTH_SESSION_CODES = ["session_not_found", "bad_jwt"];

/** PostgreSQL's insufficient_privilege: RLS or a function refused the action. */
const PERMISSION_DENIED_CODE = "42501";

/** Translation key shown instead of PostgREST's English message. */
export const PERMISSION_DENIED_MESSAGE = "tekfusion.common.forbidden";

/**
 * True when the error means there is no valid session any more. A 403 alone
 * does not: PostgREST answers 403 when RLS refuses a write, and the user is
 * still logged in.
 */
export const isSessionLost = (error: unknown): boolean => {
  const { status, name, code } = asApiError(error);
  return (
    status === 401 ||
    // supabase-js reports a missing session as a 400.
    (status === 400 && name === "AuthSessionMissingError") ||
    (status === 403 && code != null && AUTH_SESSION_CODES.includes(code))
  );
};

/** True when the base refused the action: HttpError (body.code) or supabase-js (code). */
export const isPermissionDenied = (error: unknown): boolean => {
  const { code, body } = asApiError(error);
  return (
    code === PERMISSION_DENIED_CODE || body?.code === PERMISSION_DENIED_CODE
  );
};

/**
 * Translation key for a screen that shows its own fixed text on failure: the
 * "no permission" text when the base refused (42501 or a 403), else `fallback`.
 */
export const errorMessageKey = (error: unknown, fallback: string): string =>
  isPermissionDenied(error) || asApiError(error).status === 403
    ? PERMISSION_DENIED_MESSAGE
    : fallback;

/** The same error with a message in Spanish when the base refused the action. */
export const toDisplayError = (error: unknown): unknown => {
  if (!isPermissionDenied(error)) return error;
  const { status, code, body } = asApiError(error);
  return Object.assign(new Error(PERMISSION_DENIED_MESSAGE, { cause: error }), {
    status,
    code,
    body,
  });
};

/** Wraps a data provider so every refused action carries the Spanish message. */
export const withPermissionDeniedMessage = <T extends object>(provider: T): T =>
  new Proxy(provider, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        return result instanceof Promise
          ? result.catch((error: unknown) => {
              throw toDisplayError(error);
            })
          : result;
      };
    },
  });
