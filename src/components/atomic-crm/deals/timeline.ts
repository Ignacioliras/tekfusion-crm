import type {
  Alert,
  AuditLogEntry,
  Deal,
  DealNote,
  Followup,
  Quote,
} from "../types";

// One chronological feed for the lead file (RF-05). WhatsApp messages and
// emails join it in Fases 4 and 5.
export type TimelineEntry =
  | { kind: "created"; key: string; date: string; deal: Deal }
  | { kind: "note"; key: string; date: string; note: DealNote }
  | { kind: "audit"; key: string; date: string; entry: AuditLogEntry }
  | { kind: "quote"; key: string; date: string; quote: Quote }
  | { kind: "followup"; key: string; date: string; followup: Followup }
  | { kind: "alert"; key: string; date: string; alert: Alert };

export interface TimelineSources {
  deal: Deal;
  notes?: DealNote[];
  audit?: AuditLogEntry[];
  quotes?: Quote[];
  followups?: Followup[];
  alerts?: Alert[];
}

const TIMELINE_ACTIONS = ["deal.stage_changed", "deal.reassigned"];

/** Newest first. Pending follow-ups are not history: they live in the scheduler. */
export const buildTimeline = ({
  deal,
  notes = [],
  audit = [],
  quotes = [],
  followups = [],
  alerts = [],
}: TimelineSources): TimelineEntry[] => {
  const entries: TimelineEntry[] = [
    { kind: "created", key: `deal-${deal.id}`, date: deal.created_at, deal },
    ...notes.map((note) => ({
      kind: "note" as const,
      key: `note-${note.id}`,
      date: note.date,
      note,
    })),
    ...audit
      .filter((entry) => TIMELINE_ACTIONS.includes(entry.action))
      .map((entry) => ({
        kind: "audit" as const,
        key: `audit-${entry.id}`,
        date: entry.created_at,
        entry,
      })),
    ...quotes.map((quote) => ({
      kind: "quote" as const,
      key: `quote-${quote.id}`,
      date: quote.created_at,
      quote,
    })),
    ...followups
      .filter((followup) => followup.status !== "pendiente")
      .map((followup) => ({
        kind: "followup" as const,
        key: `followup-${followup.id}`,
        date: followup.sent_at ?? followup.scheduled_at,
        followup,
      })),
    ...alerts.map((alert) => ({
      kind: "alert" as const,
      key: `alert-${alert.id}`,
      date: alert.created_at,
      alert,
    })),
  ];
  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};
