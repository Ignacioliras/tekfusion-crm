import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useGetIdentity, useNotify, useTranslate } from "ra-core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { getVerifiedFactor, useMfaApi } from "./mfaApi";
import { MfaEnrollForm } from "./MfaEnrollForm";

/** Configuración → Mi perfil: status of the two-step verification, enable / disable. */
export const MfaSection = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const mfa = useMfaApi();
  const { identity } = useGetIdentity();
  const queryClient = useQueryClient();
  const [isEnrolling, setEnrolling] = useState(false);
  // Managers cannot turn it off (docs/08).
  const isRequired = identity?.role === "manager";

  const factor = useQuery({
    queryKey: ["mfa", "factor"],
    queryFn: () => getVerifiedFactor(mfa!),
    enabled: !!mfa,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["mfa"] });

  const disable = useMutation({
    mutationFn: async () => {
      const { error } = await mfa!.unenroll({ factorId: factor.data!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      notify("crm.mfa.unenrolled", { type: "info" });
    },
    onError: () => notify("crm.mfa.enroll_error", { type: "error" }),
  });

  if (!mfa || factor.isPending) return null;
  const isEnabled = !!factor.data;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-muted-foreground">
            {translate("crm.mfa.title")}
          </h2>
          <Badge variant="outline" className="gap-1">
            {isEnabled ? (
              <ShieldCheck className="size-3" />
            ) : (
              <ShieldOff className="size-3" />
            )}
            {translate(isEnabled ? "crm.mfa.enabled" : "crm.mfa.disabled")}
          </Badge>
        </div>
        {isRequired && (
          <p className="text-sm text-muted-foreground">
            {translate("crm.mfa.required_hint")}
          </p>
        )}
        {isEnrolling ? (
          <MfaEnrollForm
            mfa={mfa}
            onEnrolled={() => {
              setEnrolling(false);
              refresh();
              notify("crm.mfa.enrolled", { type: "success" });
            }}
          />
        ) : (
          <div className="flex justify-end">
            {isEnabled ? (
              !isRequired && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => disable.mutate()}
                  disabled={disable.isPending}
                >
                  {translate("crm.mfa.disable")}
                </Button>
              )
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEnrolling(true)}
              >
                {translate("crm.mfa.enable")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
