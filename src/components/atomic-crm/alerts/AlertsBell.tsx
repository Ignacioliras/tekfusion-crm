import { Bell } from "lucide-react";
import { useGetIdentity, useGetList, useTranslate } from "ra-core";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { Alert } from "../types";
import { AlertsPanel } from "./AlertsPanel";

// ponytail: loads at most 100 unread alerts; paginate the panel if a user ever piles up more.
const MAX_ALERTS = 100;

/**
 * Header bell: unread alerts addressed to the current user. Managers see
 * everyone's alerts elsewhere (RLS lets them), but the bell only counts their own.
 */
export const AlertsBell = () => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const { identity } = useGetIdentity();
  const { data = [] } = useGetList<Alert>(
    "alerts",
    {
      filter: { recipient_sales_id: identity?.id, "read_at@is": null },
      pagination: { page: 1, perPage: MAX_ALERTS },
      sort: { field: "created_at", order: "DESC" },
    },
    { enabled: identity?.id != null },
  );
  // Marking updates the cached records in place: drop them here at once
  // instead of waiting for the list to be fetched again.
  const unread = data.filter((alert) => !alert.read_at);
  const count = unread.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label={translate("tekfusion.alerts.bell", { count })}
          />
        }
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white"
          >
            {count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <AlertsPanel alerts={unread} onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
