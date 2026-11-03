import { useMutation, useQuery } from "@tanstack/react-query";
import { useNotify, useTranslate } from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getVerifiedFactor, type MfaApi } from "./mfaApi";

/** Asks for the authenticator code of the user's verified factor. */
export const MfaVerifyForm = ({
  mfa,
  onVerified,
}: {
  mfa: MfaApi;
  onVerified: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [code, setCode] = useState("");

  const factor = useQuery({
    queryKey: ["mfa", "factor"],
    queryFn: () => getVerifiedFactor(mfa),
    // Never written to localStorage (CRM.tsx persists react-query).
    meta: { persist: false },
  });

  const verify = useMutation({
    mutationFn: async () => {
      const factorId = factor.data!.id;
      const challenge = await mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verified = await mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) throw verified.error;
    },
    onSuccess: onVerified,
    onError: () => {
      setCode("");
      notify("crm.mfa.invalid_code", { type: "error" });
    },
  });

  if (!factor.data) return null;

  const handleSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    verify.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {translate("crm.mfa.verify_intro")}
      </p>
      <div className="space-y-2">
        <Label htmlFor="mfa-verify-code">{translate("crm.mfa.code")}</Label>
        <Input
          id="mfa-verify-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          autoFocus
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={verify.isPending || code.length < 6}
      >
        {translate("crm.mfa.verify")}
      </Button>
    </form>
  );
};
