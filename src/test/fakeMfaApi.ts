import type { MfaApi } from "@/components/atomic-crm/mfa/mfaApi";

export const FAKE_MFA_CODE = "123456";

type FakeFactor = {
  id: string;
  friendly_name: string;
  factor_type: "totp";
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
};

/**
 * An in-memory stand-in for supabase-js `auth.mfa`: one TOTP factor, verified
 * by FAKE_MFA_CODE. `verified: true` starts with a factor already enrolled.
 * `latency` (ms) makes every call take that long, like the network. Like
 * Supabase, enrolling a second factor with a taken friendly name fails (422).
 */
export const createFakeMfaApi = ({
  verified = false,
  latency = 0,
} = {}): MfaApi => {
  const wait = () => new Promise((resolve) => setTimeout(resolve, latency));
  let factors: FakeFactor[] = verified
    ? [
        {
          id: "f1",
          friendly_name: "CRM TekFusion",
          factor_type: "totp",
          status: "verified",
          created_at: "",
          updated_at: "",
        },
      ]
    : [];
  let next = factors.length + 1;
  const list = () => ({
    all: factors,
    totp: factors,
    phone: [],
    // supabase-js also types webauthn factors; none here
  });

  // The real client's types are richer than what the screens need; the fake
  // is cast where it returns less.
  return {
    enroll: (async ({ friendlyName }: { friendlyName?: string }) => {
      await wait();
      if (factors.some((factor) => factor.friendly_name === friendlyName)) {
        return {
          data: null,
          error: {
            message: `A factor with the friendly name "${friendlyName}" for this user already exists`,
            name: "AuthApiError",
            status: 422,
          },
        };
      }
      const factor: FakeFactor = {
        id: `f${next++}`,
        friendly_name: friendlyName ?? "",
        factor_type: "totp",
        status: "unverified",
        created_at: "",
        updated_at: "",
      };
      factors = [...factors, factor];
      return {
        data: {
          id: factor.id,
          type: "totp",
          friendly_name: factor.friendly_name,
          totp: {
            qr_code:
              "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg'/>",
            secret: "JBSWY3DPEHPK3PXP",
            uri: "otpauth://totp/CRM:andrea?secret=JBSWY3DPEHPK3PXP",
          },
        },
        error: null,
      };
    }) as unknown as MfaApi["enroll"],
    challenge: (async () => ({
      data: { id: "c1", type: "totp", expires_at: 0 },
      error: null,
    })) as unknown as MfaApi["challenge"],
    verify: (async ({ factorId, code }: { factorId: string; code: string }) => {
      if (code !== FAKE_MFA_CODE) {
        return {
          data: null,
          error: {
            message: "Invalid TOTP code entered",
            name: "AuthApiError",
            status: 422,
          },
        };
      }
      factors = factors.map((factor) =>
        factor.id === factorId ? { ...factor, status: "verified" } : factor,
      );
      return {
        data: {
          access_token: "t",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "r",
          user: {},
        },
        error: null,
      };
    }) as unknown as MfaApi["verify"],
    listFactors: (async () => {
      await wait();
      return { data: list(), error: null };
    }) as unknown as MfaApi["listFactors"],
    unenroll: (async ({ factorId }: { factorId: string }) => {
      await wait();
      factors = factors.filter((factor) => factor.id !== factorId);
      return { data: { id: factorId }, error: null };
    }) as unknown as MfaApi["unenroll"],
  };
};
