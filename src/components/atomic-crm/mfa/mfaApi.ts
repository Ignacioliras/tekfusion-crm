import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuthProvider } from "ra-core";

// Two-step verification (TOTP, docs/08): mandatory for managers, optional for
// the rest. The Supabase authProvider exposes the MFA client and says what the
// current session still needs (MfaGate); the FakeRest one exposes nothing, so
// the demo and the tests run without MFA unless they inject a fake API.

/** The part of supabase-js `auth.mfa` the screens use (also what the test fake implements). */
export type MfaApi = Pick<
  SupabaseClient["auth"]["mfa"],
  "enroll" | "challenge" | "verify" | "listFactors" | "unenroll"
>;

/** What the session must do before using the CRM: verify, enroll, or nothing. */
export type MfaRequirement = "verify" | "enroll" | null;

export const MFA_FACTOR_NAME = "CRM TekFusion";

export const MFA_ROUTES = {
  enroll: "/mfa/enroll",
  verify: "/mfa/verify",
} as const;

/** The MFA client of the current authProvider, or undefined when it has none. */
export const useMfaApi = (): MfaApi | undefined => {
  const authProvider = useAuthProvider();
  return authProvider?.getMfaApi?.();
};

/** The verified TOTP factor of the logged-in user, or null. */
export const getVerifiedFactor = async (mfa: MfaApi) => {
  const { data, error } = await mfa.listFactors();
  if (error) throw error;
  return data.totp.find((factor) => factor.status === "verified") ?? null;
};
