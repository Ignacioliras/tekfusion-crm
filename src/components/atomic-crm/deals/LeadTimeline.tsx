import {
  ListBase,
  ResourceContextProvider,
  useGetList,
  useListContext,
  useTranslate,
  type Identifier,
} from "ra-core";
import {
  ArrowRightLeft,
  Bell,
  FileText,
  Flag,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Note } from "../notes/Note";
import { NoteCreate } from "../notes/NoteCreate";
import { RelativeDate } from "../misc/RelativeDate";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { useGetSalesName } from "../sales/useGetSalesName";
import { CANALES_ENVIO, CANALES_ORIGEN, labelOf } from "../tekfusion/canales";
import { formatAmount } from "../tekfusion/money";
import type {
  Alert,
  AuditLogEntry,
  Deal,
  DealNote,
  Followup,
  Quote,
  SendChannel,
} from "../types";
import { findDealLabel } from "./dealUtils";
import { buildTimeline, type TimelineEntry } from "./timeline";

const BY_DEAL = (deal: Deal) => ({
  filter: { deal_id: deal.id },
  pagination: { page: 1, perPage: 200 },
  sort: { field: "id", order: "DESC" as const },
});

/** Lead timeline (RF-05): note box on top, then every event, newest first. */
export const LeadTimeline = ({ deal }: { deal: Deal }) => (
  <ListBase
    resource="deal_notes"
    filter={{ deal_id: deal.id }}
    sort={{ field: "date", order: "DESC" }}
    perPage={200}
    disableSyncWithLocation
    storeKey={false}
  >
    <ResourceContextProvider value="deal_notes">
      <NoteCreate reference="deals" />
      <TimelineFeed deal={deal} />
    </ResourceContextProvider>
  </ListBase>
);

const TimelineFeed = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const { data: notes } = useListContext<DealNote>();
  const { data: audit } = useGetList<AuditLogEntry>("audit_log", BY_DEAL(deal));
  const { data: quotes } = useGetList<Quote>("quotes", BY_DEAL(deal));
  const { data: followups } = useGetList<Followup>("followups", BY_DEAL(deal));
  const { data: alerts } = useGetList<Alert>("alerts", BY_DEAL(deal));
  const entries = buildTimeline({
    deal,
    notes,
    audit,
    quotes,
    followups,
    alerts,
  });

  return (
    <section
      aria-label={translate("tekfusion.lead.timeline.title")}
      className="mt-6"
    >
      <h3 className="text-sm font-semibold mb-3">
        {translate("tekfusion.lead.timeline.title")}
      </h3>
      {entries.length === 1 ? (
        <p className="text-sm text-muted-foreground mb-4">
          {translate("tekfusion.lead.timeline.empty")}
        </p>
      ) : null}
      <ol className="flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={entry.key}>
            <TimelineItem entry={entry} />
          </li>
        ))}
      </ol>
    </section>
  );
};

const TimelineItem = ({ entry }: { entry: TimelineEntry }) => {
  switch (entry.kind) {
    case "note":
      return <Note note={entry.note} showStatus />;
    case "created":
      return <CreatedItem entry={entry} />;
    case "audit":
      return <AuditItem entry={entry.entry} />;
    case "quote":
      return <QuoteItem quote={entry.quote} />;
    case "followup":
      return <FollowupItem followup={entry.followup} />;
    case "alert":
      return <AlertItem alert={entry.alert} />;
  }
};

const EventRow = ({
  icon,
  date,
  actorId,
  children,
}: {
  icon: ReactNode;
  date: string;
  actorId?: Identifier | null;
  children: ReactNode;
}) => {
  const translate = useTranslate();
  const actor = useGetSalesName(actorId ?? undefined, {
    enabled: actorId != null,
  });
  return (
    <div className="flex gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="flex-1">
        <div>{children}</div>
        <div className="text-xs text-muted-foreground">
          <RelativeDate date={date} />
          {actorId != null && actor
            ? ` · ${translate("tekfusion.lead.timeline.by", { name: actor })}`
            : null}
        </div>
      </div>
    </div>
  );
};

const channelsLabel = (channels: SendChannel[]) =>
  channels.map((channel) => labelOf(CANALES_ENVIO, channel)).join(" y ");

const CreatedItem = ({
  entry,
}: {
  entry: Extract<TimelineEntry, { kind: "created" }>;
}) => {
  const translate = useTranslate();
  return (
    <EventRow icon={<Sparkles className="size-4" />} date={entry.date}>
      {translate("tekfusion.lead.timeline.created", {
        channel: labelOf(CANALES_ORIGEN, entry.deal.origin_channel),
      })}
    </EventRow>
  );
};

const AuditItem = ({ entry }: { entry: AuditLogEntry }) => {
  const translate = useTranslate();
  const { dealStages } = useConfigurationContext();
  const from = entry.details.from as Identifier | string | null | undefined;
  const to = entry.details.to as Identifier | string | null | undefined;
  const fromName = useGetSalesName((from as Identifier) ?? undefined, {
    enabled: entry.action === "deal.reassigned" && from != null,
  });
  const toName = useGetSalesName((to as Identifier) ?? undefined, {
    enabled: entry.action === "deal.reassigned" && to != null,
  });
  const unassigned = translate("tekfusion.common.unassigned");

  if (entry.action === "deal.stage_changed") {
    return (
      <EventRow
        icon={<Flag className="size-4" />}
        date={entry.created_at}
        actorId={entry.actor_sales_id}
      >
        {translate("tekfusion.lead.timeline.stage_changed", {
          from: findDealLabel(dealStages, String(from)),
          to: findDealLabel(dealStages, String(to)),
        })}
      </EventRow>
    );
  }
  return (
    <EventRow
      icon={<UserRound className="size-4" />}
      date={entry.created_at}
      actorId={entry.actor_sales_id}
    >
      {from == null
        ? translate("tekfusion.lead.timeline.assigned", {
            to: toName || unassigned,
          })
        : translate("tekfusion.lead.timeline.reassigned", {
            from: fromName,
            to: to == null ? unassigned : toName,
          })}
    </EventRow>
  );
};

const QuoteItem = ({ quote }: { quote: Quote }) => {
  const translate = useTranslate();
  const { currency } = useConfigurationContext();
  return (
    <EventRow
      icon={<FileText className="size-4" />}
      date={quote.created_at}
      actorId={quote.sales_id}
    >
      <span className="font-medium">
        {translate("tekfusion.lead.timeline.quote", {
          version: quote.version,
          amount: formatAmount(quote.amount, currency),
        })}
      </span>
      <span className="text-muted-foreground">
        {" · "}
        {quote.sent_channels.length
          ? translate("tekfusion.lead.timeline.quote_queued", {
              channels: channelsLabel(quote.sent_channels),
              status: translate(
                `tekfusion.delivery_status.${quote.delivery_status}`,
              ),
            })
          : translate("tekfusion.lead.timeline.quote_not_sent")}
      </span>
    </EventRow>
  );
};

const FollowupItem = ({ followup }: { followup: Followup }) => {
  const translate = useTranslate();
  const date = followup.sent_at ?? followup.scheduled_at;
  const icon =
    followup.status === "enviado" ? (
      <Send className="size-4" />
    ) : (
      <ArrowRightLeft className="size-4" />
    );
  const text =
    followup.status === "enviado"
      ? translate("tekfusion.lead.timeline.followup_sent", {
          step: followup.step,
          channels: channelsLabel(followup.channels),
        })
      : followup.status === "cancelado"
        ? translate("tekfusion.lead.timeline.followup_cancelled", {
            step: followup.step,
            reason: followup.cancel_reason ?? "",
          })
        : translate("tekfusion.lead.timeline.followup_overdue", {
            step: followup.step,
          });
  return (
    <EventRow icon={icon} date={date}>
      {text}
    </EventRow>
  );
};

const AlertItem = ({ alert }: { alert: Alert }) => {
  const translate = useTranslate();
  return (
    <EventRow icon={<Bell className="size-4" />} date={alert.created_at}>
      {translate("tekfusion.lead.timeline.alert", { message: alert.message })}
    </EventRow>
  );
};
