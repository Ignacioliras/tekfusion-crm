import type { TranslateFunction as Translate } from "ra-core";

import { lineaCorta } from "../tekfusion/lineas";
import type { Alert, Deal } from "../types";

const HOUR_MS = 3600 * 1000;

const elapsed = (from: string, now: Date, translate: Translate): string => {
  const hours = Math.max(
    0,
    Math.floor((now.getTime() - new Date(from).getTime()) / HOUR_MS),
  );
  return hours < 48
    ? translate("tekfusion.alerts.elapsed_hours", { hours })
    : translate("tekfusion.alerts.elapsed_days", {
        days: Math.floor(hours / 24),
      });
};

/** What happened, in a few words: "sin contacto hace 26 h". */
const whatHappened = (
  alert: Alert,
  deal: Deal,
  now: Date,
  translate: Translate,
): string => {
  switch (alert.type) {
    case "sin_contacto_24h":
    case "sin_contacto_48h":
      return translate("tekfusion.alerts.what.no_contact", {
        elapsed: elapsed(deal.created_at, now, translate),
      });
    case "sin_asignar":
      return translate("tekfusion.alerts.what.unassigned", {
        elapsed: elapsed(deal.created_at, now, translate),
      });
    case "por_archivar":
      return translate("tekfusion.alerts.what.to_archive", {
        elapsed: elapsed(
          deal.last_activity_at ?? deal.created_at,
          now,
          translate,
        ),
      });
    default:
      return translate(`tekfusion.alerts.what.${alert.type}`);
  }
};

/**
 * One line naming company, business line and what happened:
 * "Edificaciones Cordillera · Geoceldas: sin contacto hace 26 h".
 * Without a lead (WhatsApp disconnected) or when the lead is not readable,
 * the stored system message is shown as is.
 */
export const alertText = (
  alert: Alert,
  deal: Deal | undefined,
  companyName: string | undefined,
  now: Date,
  translate: Translate,
): string => {
  if (!deal) return alert.message;
  const who = [companyName, lineaCorta(deal.business_line)]
    .filter(Boolean)
    .join(" · ");
  return `${who}: ${whatHappened(alert, deal, now, translate)}`;
};
