import { useNotify, useTranslate, useUpdate, useUpdateMany } from "ra-core";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

import { RelativeDate } from "../misc/RelativeDate";
import type { Alert } from "../types";
import { ALERT_TYPES } from "./alertTypes";

/**
 * Unread alerts grouped by type. Marking sends only { read_at }: it is the one
 * column the database lets a recipient change (12_tekfusion_grants.sql).
 */
export const AlertsPanel = ({
  alerts,
  onNavigate,
}: {
  alerts: Alert[];
  onNavigate: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [update, { isPending: isUpdating }] = useUpdate<Alert>();
  const [updateMany, { isPending: isUpdatingMany }] = useUpdateMany<Alert>();
  const onError = () => notify("tekfusion.alerts.error", { type: "error" });

  const markRead = (alert: Alert) =>
    update(
      "alerts",
      {
        id: alert.id,
        data: { read_at: new Date().toISOString() },
        previousData: alert,
      },
      { onError },
    );

  const markAllRead = () =>
    updateMany(
      "alerts",
      {
        ids: alerts.map((alert) => alert.id),
        data: { read_at: new Date().toISOString() },
      },
      { onError },
    );

  const groups = ALERT_TYPES.map((type) => ({
    type,
    alerts: alerts.filter((alert) => alert.type === type),
  })).filter((group) => group.alerts.length > 0);

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-semibold">{translate("tekfusion.alerts.title")}</h2>
        {alerts.length > 0 ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={markAllRead}
            disabled={isUpdatingMany}
          >
            {translate("tekfusion.alerts.mark_all_read")}
          </Button>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <p className="px-4 py-6 text-center text-muted-foreground">
          {translate("tekfusion.alerts.empty")}
        </p>
      ) : (
        <div className="overflow-y-auto">
          {groups.map((group) => {
            const label = translate(`tekfusion.alerts.types.${group.type}`);
            return (
              <section
                key={group.type}
                aria-label={label}
                className="border-b last:border-b-0"
              >
                <h3 className="bg-muted/50 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {label} ({group.alerts.length})
                </h3>
                <ul>
                  {group.alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="flex flex-col gap-1 px-4 py-2"
                    >
                      {/* system text, rendered as plain text */}
                      <p>{alert.message}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <RelativeDate date={alert.created_at} />
                        {alert.deal_id != null ? (
                          <Link
                            to={`/deals/${alert.deal_id}/show`}
                            onClick={onNavigate}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {translate("tekfusion.alerts.open_lead")}
                          </Link>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7"
                          onClick={() => markRead(alert)}
                          disabled={isUpdating}
                        >
                          {translate("tekfusion.alerts.mark_read")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
