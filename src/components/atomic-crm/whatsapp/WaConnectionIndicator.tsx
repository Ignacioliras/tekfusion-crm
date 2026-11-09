import { useQuery } from "@tanstack/react-query";
import { useCanAccess, useDataProvider, useTranslate } from "ra-core";
import { Link } from "react-router";

import type { CrmDataProvider } from "../providers/types";
import { SettingsPage } from "../settings/SettingsPage";

// docs/07: global connection indicator of the corporate number, read from the
// instance state through wa_connection_status() (the table stays closed).
const REFRESH_MS = 60_000;

type ConnectionState = "connected" | "disconnected" | "unknown";

const DOT_CLASSES: Record<ConnectionState, string> = {
  connected: "bg-emerald-500",
  disconnected: "bg-destructive",
  unknown: "bg-muted-foreground",
};

// One query for the dot and the banner (same key): a single request a minute.
const useWaConnectionStatus = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  return useQuery({
    queryKey: ["wa_connection_status"],
    queryFn: () => dataProvider.getWaConnectionStatus(),
    refetchInterval: REFRESH_MS,
    // The next poll is the retry: a failed read shows "unknown" right away.
    retry: false,
  });
};

/** Green/red dot for the WhatsApp menu item; grey when the state can't be read. */
export const WaConnectionIndicator = () => {
  const translate = useTranslate();
  const { data, isError } = useWaConnectionStatus();
  if (!data && !isError) return null;

  const state: ConnectionState = !data
    ? "unknown"
    : data.connected
      ? "connected"
      : "disconnected";
  const label = translate(`tekfusion.whatsapp.connection.${state}`);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block size-2 shrink-0 rounded-full ${DOT_CLASSES[state]}`}
    />
  );
};

/** Red banner of the inbox while the number is disconnected. */
export const WaDisconnectedBanner = () => {
  const translate = useTranslate();
  const { data } = useWaConnectionStatus();
  // Reconnecting happens in Configuración, which only managers open.
  const { canAccess: canConfigure } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  if (data?.connected !== false) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <strong>{translate("tekfusion.whatsapp.connection.disconnected")}</strong>
      <span>{translate("tekfusion.whatsapp.connection.hint")}</span>
      {canConfigure ? (
        <Link to={SettingsPage.path} className="font-medium underline">
          {translate("tekfusion.whatsapp.connection.settings_link")}
        </Link>
      ) : null}
    </div>
  );
};
