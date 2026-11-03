import { useQuery } from "@tanstack/react-query";
import { useAuthProvider } from "ra-core";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { MFA_ROUTES, type MfaRequirement } from "./mfaApi";

/**
 * Sits in the CRM layouts: a session that still has to verify its second
 * factor (or, for a manager, enroll one) is sent to the MFA pages before it
 * sees anything. The check reads the session's assurance level locally
 * (authProvider.getMfaRequirement), so it costs no request.
 */
export const MfaGate = ({ children }: { children: ReactNode }) => {
  const authProvider = useAuthProvider();
  const location = useLocation();
  const { data: requirement, isPending } = useQuery<MfaRequirement>({
    queryKey: ["mfa", "requirement"],
    queryFn: () => authProvider?.getMfaRequirement?.() ?? null,
    staleTime: 0,
    gcTime: 0,
  });

  if (isPending) return null;
  if (requirement === "verify") {
    return (
      <Navigate
        to={MFA_ROUTES.verify}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }
  if (requirement === "enroll") {
    return <Navigate to={MFA_ROUTES.enroll} replace />;
  }
  return <>{children}</>;
};
