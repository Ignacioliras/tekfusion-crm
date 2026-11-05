import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify, useTranslate } from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MFA_FACTOR_NAME, type MfaApi } from "./mfaApi";

/**
 * Enrolls a TOTP factor: shows the QR code (and the secret, for phones that
 * cannot scan) and confirms it with the first code of the authenticator app.
 */
export const MfaEnrollForm = ({
  mfa,
  onEnrolled,
}: {
  mfa: MfaApi;
  onEnrolled: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [code, setCode] = useState("");

  const enrollment = useQuery({
    queryKey: ["mfa", "enrollment"],
    queryFn: async () => {
      const { data: factors } = await mfa.listFactors();
      // Confirming invalidates every query and this one runs again: with the
      // factor already verified there is nothing to enroll (the name is taken,
      // Supabase would answer 422).
      if (factors?.totp.some((factor) => factor.status === "verified")) {
        return null;
      }
      // A previous attempt that was never confirmed keeps the name taken.
      for (const factor of factors?.all ?? []) {
        if (factor.status === "unverified") {
          await mfa.unenroll({ factorId: factor.id });
        }
      }
      const { data, error } = await mfa.enroll({
        factorType: "totp",
        friendlyName: MFA_FACTOR_NAME,
      });
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    // Never written to localStorage (CRM.tsx persists react-query).
    meta: { persist: false },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const factorId = enrollment.data!.id;
      const challenge = await mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verified = await mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) throw verified.error;
    },
    onSuccess: onEnrolled,
    onError: () => notify("crm.mfa.invalid_code", { type: "error" }),
  });

  if (enrollment.isError) {
    return (
      <p className="text-destructive">{translate("crm.mfa.enroll_error")}</p>
    );
  }
  if (!enrollment.data) return null;

  const handleSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    confirm.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {translate("crm.mfa.enroll_intro")}
      </p>
      <img
        src={enrollment.data.totp.qr_code}
        alt={translate("crm.mfa.qr_alt")}
        className="h-48 w-48 rounded-md border bg-white p-2"
      />
      <p className="text-xs text-muted-foreground">
        {translate("crm.mfa.secret")}{" "}
        <code className="select-all font-mono">
          {enrollment.data.totp.secret}
        </code>
      </p>
      <div className="space-y-2">
        <Label htmlFor="mfa-enroll-code">{translate("crm.mfa.code")}</Label>
        <Input
          id="mfa-enroll-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={confirm.isPending || code.length < 6}>
        {translate("crm.mfa.confirm")}
      </Button>
    </form>
  );
};
