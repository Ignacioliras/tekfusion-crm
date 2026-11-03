import { useQueryClient } from "@tanstack/react-query";
import { useLogout, useNotify, useTranslate } from "ra-core";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/supabase/layout";

import { MFA_ROUTES, useMfaApi } from "./mfaApi";
import { MfaEnrollForm } from "./MfaEnrollForm";
import { MfaVerifyForm } from "./MfaVerifyForm";

// Full-page steps the MfaGate sends the user to, outside the CRM layout.

const useLeave = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  return () => {
    // The session is now aal2: let the gate look again.
    queryClient.invalidateQueries({ queryKey: ["mfa"] });
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? "/", { replace: true });
  };
};

const LogoutLink = () => {
  const translate = useTranslate();
  const logout = useLogout();
  return (
    <Button variant="link" type="button" onClick={() => logout()}>
      {translate("crm.mfa.logout")}
    </Button>
  );
};

export const MfaEnrollPage = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const mfa = useMfaApi();
  const leave = useLeave();
  if (!mfa) return null;
  return (
    <Layout>
      <h1 className="text-2xl font-semibold">
        {translate("crm.mfa.enroll_title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {translate("crm.mfa.required_hint")}
      </p>
      <MfaEnrollForm
        mfa={mfa}
        onEnrolled={() => {
          notify("crm.mfa.enrolled", { type: "success" });
          leave();
        }}
      />
      <LogoutLink />
    </Layout>
  );
};
MfaEnrollPage.path = MFA_ROUTES.enroll;

export const MfaVerifyPage = () => {
  const translate = useTranslate();
  const mfa = useMfaApi();
  const leave = useLeave();
  if (!mfa) return null;
  return (
    <Layout>
      <h1 className="text-2xl font-semibold">
        {translate("crm.mfa.verify_title")}
      </h1>
      <MfaVerifyForm mfa={mfa} onVerified={leave} />
      <LogoutLink />
    </Layout>
  );
};
MfaVerifyPage.path = MFA_ROUTES.verify;
