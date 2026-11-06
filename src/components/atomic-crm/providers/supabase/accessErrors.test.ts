import { HttpError } from "ra-core";

import { testI18nProvider } from "../commons/i18nProvider";
import { isSessionLost, withPermissionDeniedMessage } from "./accessErrors";

// What PostgREST answers when RLS refuses a write (fetchJson builds the HttpError).
const rlsDenied = () =>
  new HttpError(
    'new row violates row-level security policy for table "deals"',
    403,
    { code: "42501", message: "new row violates row-level security policy" },
  );
// What supabase-js throws from an Auth call.
const authError = (status: number, code: string, name = "AuthApiError") =>
  Object.assign(new Error(code), { status, code, name });

describe("isSessionLost", () => {
  it("ends the session on a 401", () => {
    expect(isSessionLost(new HttpError("JWT expired", 401))).toBe(true);
  });

  it("ends the session on the 400 supabase-js gives when the session is missing", () => {
    expect(
      isSessionLost(
        authError(400, "session_missing", "AuthSessionMissingError"),
      ),
    ).toBe(true);
  });

  it.each(["session_not_found", "bad_jwt"])(
    "ends the session on an Auth 403 with code %s",
    (code) => {
      expect(isSessionLost(authError(403, code))).toBe(true);
    },
  );

  it("keeps the session when PostgREST answers 403 because RLS refused the action", () => {
    expect(isSessionLost(rlsDenied())).toBe(false);
  });

  it("keeps the session on any other 403, 400 or error without status", () => {
    expect(isSessionLost(authError(403, "insufficient_aal"))).toBe(false);
    expect(isSessionLost(new HttpError("Forbidden", 403))).toBe(false);
    expect(isSessionLost(new HttpError("Bad request", 400))).toBe(false);
    expect(isSessionLost(new Error("network"))).toBe(false);
    expect(isSessionLost(undefined)).toBe(false);
    expect(isSessionLost("403")).toBe(false);
  });
});

describe("withPermissionDeniedMessage", () => {
  it("gives a refused action a message in Spanish and keeps it from ending the session", async () => {
    const provider = withPermissionDeniedMessage({
      update: async () => {
        throw rlsDenied();
      },
    });

    const error = await provider.update().catch((caught: unknown) => caught);

    expect(testI18nProvider.translate((error as Error).message)).toBe(
      "No tienes permiso para hacer esto.",
    );
    expect(error).toMatchObject({ status: 403, body: { code: "42501" } });
    expect(isSessionLost(error)).toBe(false);
  });

  it("translates the 42501 a function raises through supabase-js too", async () => {
    const provider = withPermissionDeniedMessage({
      takeDeal: async () => {
        throw Object.assign(new Error("only managers"), { code: "42501" });
      },
    });

    const error = await provider.takeDeal().catch((caught: unknown) => caught);

    expect(testI18nProvider.translate((error as Error).message)).toBe(
      "No tienes permiso para hacer esto.",
    );
  });

  it("leaves other errors, results and plain properties untouched", async () => {
    const expired = new HttpError("JWT expired", 401);
    const provider = withPermissionDeniedMessage({
      supportAbortSignal: true,
      getOne: async () => ({ data: { id: 1 } }),
      getList: async () => {
        throw expired;
      },
    });

    expect(provider.supportAbortSignal).toBe(true);
    await expect(provider.getOne()).resolves.toEqual({ data: { id: 1 } });
    await expect(provider.getList()).rejects.toBe(expired);
  });
});
