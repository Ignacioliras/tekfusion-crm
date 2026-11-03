import { CalendarPlus } from "lucide-react";
import {
  Form,
  useCanAccess,
  useGetList,
  useLocaleState,
  useNotify,
  useRefresh,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState } from "react";
import type { FieldValues } from "react-hook-form";

import { TextInput } from "@/components/admin/text-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toIntlLocale } from "../misc/RelativeDate";
import { CANALES_ENVIO, labelOf } from "../tekfusion/canales";
import type { Deal, Followup } from "../types";
import { FollowupDialog } from "./FollowupDialog";

const OPEN_STATUSES: readonly Followup["status"][] = ["pendiente", "vencido"];

const useDealFollowups = (deal: Deal) =>
  useGetList<Followup>("followups", {
    filter: { deal_id: deal.id },
    pagination: { page: 1, perPage: 100 },
    sort: { field: "scheduled_at", order: "ASC" },
  });

const useFormatDate = () => {
  const [locale = "es"] = useLocaleState();
  return (date: string) =>
    new Intl.DateTimeFormat(toIntlLocale(locale), {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Santiago",
    }).format(new Date(date));
};

/**
 * Follow-ups of a lead (RF-07, UI): the next one with "Ajustar" and
 * "Cancelar", then the rest of the cadence and its history.
 */
export const FollowupScheduler = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const { data: followups = [] } = useDealFollowups(deal);
  const open = followups.filter((f) => OPEN_STATUSES.includes(f.status));
  const [next, ...later] = open;
  const done = followups.filter((f) => !OPEN_STATUSES.includes(f.status));

  return (
    <section
      aria-label={translate("tekfusion.followup.title")}
      className="flex flex-col gap-3"
    >
      <h3 className="text-sm font-semibold">
        {translate("tekfusion.followup.title")}
      </h3>
      {deal.followups_enabled ? null : (
        <p className="text-sm text-muted-foreground">
          {translate("tekfusion.followup.disabled")}
        </p>
      )}
      <section
        aria-label={translate("tekfusion.followup.next")}
        className="rounded-md border p-3 flex flex-col gap-2"
      >
        <span className="text-xs text-muted-foreground tracking-wide">
          {translate("tekfusion.followup.next")}
        </span>
        {next ? (
          <FollowupRow deal={deal} followup={next} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {translate("tekfusion.followup.none")}
          </p>
        )}
      </section>
      {later.length + done.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {[...later, ...done].map((followup) => (
            <li key={followup.id}>
              <FollowupRow deal={deal} followup={followup} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

const FollowupRow = ({
  deal,
  followup,
}: {
  deal: Deal;
  followup: Followup;
}) => {
  const translate = useTranslate();
  const formatDate = useFormatDate();
  const { canAccess: canEdit } = useCanAccess({
    resource: "deals",
    action: "edit",
    record: deal,
  });
  const [isAdjusting, setAdjusting] = useState(false);
  const [isCancelling, setCancelling] = useState(false);
  const isOpen = OPEN_STATUSES.includes(followup.status);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {translate("tekfusion.followup.step", { step: followup.step })}
        </span>
        <Badge
          variant={followup.status === "vencido" ? "destructive" : "outline"}
        >
          {translate(`tekfusion.followup.status.${followup.status}`)}
        </Badge>
      </div>
      <span>{formatDate(followup.sent_at ?? followup.scheduled_at)}</span>
      <span className="text-muted-foreground">
        {followup.channels.map((c) => labelOf(CANALES_ENVIO, c)).join(" y ")} ·{" "}
        {translate(
          followup.mode === "automatico"
            ? "tekfusion.followup.modes.automatico"
            : "tekfusion.followup.modes.recordatorio",
        )}
      </span>
      {followup.cancel_reason ? (
        <span className="text-muted-foreground">{followup.cancel_reason}</span>
      ) : null}
      {isOpen && canEdit ? (
        <div className="flex gap-2 mt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdjusting(true)}
          >
            {translate("tekfusion.followup.adjust")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCancelling(true)}>
            {translate("tekfusion.followup.cancel")}
          </Button>
        </div>
      ) : null}
      {isAdjusting ? (
        <FollowupDialog
          deal={deal}
          followup={followup}
          open
          onClose={() => setAdjusting(false)}
        />
      ) : null}
      {isCancelling ? (
        <CancelFollowupDialog
          followup={followup}
          onClose={() => setCancelling(false)}
        />
      ) : null}
    </div>
  );
};

const CancelFollowupDialog = ({
  followup,
  onClose,
}: {
  followup: Followup;
  onClose: () => void;
}) => {
  const translate = useTranslate();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleSubmit = (values: FieldValues) =>
    update(
      "followups",
      {
        id: followup.id,
        data: {
          status: "cancelado",
          cancel_reason:
            String(values.cancel_reason ?? "").trim() ||
            translate("tekfusion.followup.cancel_reason_default"),
        },
        previousData: followup,
      },
      {
        onSuccess: () => {
          notify("tekfusion.followup.cancelled", { type: "info" });
          refresh();
          onClose();
        },
        onError: () => notify("tekfusion.common.save_error", { type: "error" }),
      },
    );

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate("tekfusion.followup.cancel")}</DialogTitle>
          <DialogDescription>
            {translate("tekfusion.followup.step", { step: followup.step })}
          </DialogDescription>
        </DialogHeader>
        <Form onSubmit={handleSubmit}>
          <TextInput
            source="cancel_reason"
            label="tekfusion.followup.cancel_reason"
            helperText={false}
          />
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              {translate("tekfusion.common.close")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {translate("tekfusion.followup.cancel")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

/** "Programar seguimiento": the next step of the cadence, by hand. */
export const ScheduleFollowupButton = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const { data: followups = [] } = useDealFollowups(deal);
  const nextStep = Math.max(0, ...followups.map((f) => f.step)) + 1;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        {translate("tekfusion.lead.actions.schedule_followup")}
      </Button>
      {open ? (
        <FollowupDialog
          deal={deal}
          nextStep={nextStep}
          open
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};
