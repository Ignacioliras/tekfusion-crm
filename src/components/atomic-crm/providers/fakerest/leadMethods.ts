import type { DataProvider, Identifier, UserIdentity } from "ra-core";

import type {
  DashboardDailyRow,
  DashboardSummaryRow,
  Deal,
  Followup,
  Quote,
  SalesRankingRow,
  SalesRankingSummaryRow,
  SendChannel,
  Template,
} from "../../types";
import type { DayRange } from "../../management-dashboard/metrics";
import {
  summarizeDashboard,
  summarizeSalesRanking,
} from "../../management-dashboard/summary";
import { ETAPAS_ABIERTAS, type Etapa } from "../../tekfusion/estados";
import { quotePdfPath, validateQuoteFile } from "../commons/quoteFile";

const ALL = {
  pagination: { page: 1, perPage: 1000 },
  sort: { field: "id", order: "ASC" as const },
};
// Every day row of a view: months x lines x channels can pass 1000.
const EVERY_DAY = {
  filter: {},
  pagination: { page: 1, perPage: 100_000 },
  sort: { field: "day", order: "ASC" as const },
};
const DEFAULT_CADENCE_DAYS = [2, 5, 10];

/** Follow-up dates of a cadence: 10:00 local time, moved off weekends. */
export const cadenceDates = (from: Date, days: number[]): Date[] =>
  days.map((n) => {
    const due = new Date(from);
    due.setDate(due.getDate() + n);
    due.setHours(10, 0, 0, 0);
    const weekday = due.getDay();
    if (weekday === 6) due.setDate(due.getDate() + 2);
    if (weekday === 0) due.setDate(due.getDate() + 1);
    return due;
  });

/**
 * In-browser mirrors of take_deal() and send_quote()
 * (supabase/schemas/11_tekfusion_policies.sql) for the demo and the tests.
 */
export const createLeadMethods = (
  getDataProvider: () => DataProvider,
  getIdentity: () => Promise<UserIdentity | undefined>,
  canAccess: (params: { resource: string; action: string }) => Promise<boolean>,
) => ({
  /** dashboard_summary() over the in-memory dashboard_daily rows. */
  getDashboardSummary: async (
    range: DayRange,
  ): Promise<DashboardSummaryRow[]> => {
    const { data } = await getDataProvider().getList<DashboardDailyRow>(
      "dashboard_daily",
      EVERY_DAY,
    );
    return summarizeDashboard(data, range);
  },

  /** sales_ranking_summary(): managers only, like the sales_ranking view. */
  getSalesRankingSummary: async (
    range: DayRange,
  ): Promise<SalesRankingSummaryRow[]> => {
    if (!(await canAccess({ resource: "sales", action: "list" }))) return [];
    const { data } = await getDataProvider().getList<SalesRankingRow>(
      "sales_ranking",
      EVERY_DAY,
    );
    return summarizeSalesRanking(data, range);
  },

  /** log_export() has nothing to record in the demo: it only resolves. */
  logExport: async (
    _resource: string,
    _rowCount: number,
    _filters: Record<string, unknown>,
  ): Promise<void> => undefined,

  /** In-memory mirror of anonymize_contact() (RF-17); no files to remove here. */
  anonymizeContact: async (
    contactId: Identifier,
  ): Promise<{ filesRemoved: boolean }> => {
    const dataProvider = getDataProvider();
    const everything = {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "id", order: "ASC" as const },
    };
    const emptyNote = { text: "[contenido anonimizado]", attachments: [] };
    const { data: contact } = await dataProvider.getOne("contacts", {
      id: contactId,
    });
    await dataProvider.update("contacts", {
      id: contactId,
      data: {
        first_name: "Contacto",
        last_name: `anonimizado #${contactId}`,
        email_jsonb: [],
        phone_jsonb: [],
        avatar: null,
        title: null,
        background: null,
        linkedin_url: null,
      },
      previousData: contact,
    });
    const { data: contactNotes } = await dataProvider.getList("contact_notes", {
      ...everything,
      filter: { contact_id: contactId },
    });
    const { data: deals } = await dataProvider.getList<Deal>("deals", {
      ...everything,
      filter: {},
    });
    // Only the leads whose single contact is this one, as in the SQL function.
    const soleDealIds = deals
      .filter(
        (deal) =>
          deal.contact_ids?.length > 0 &&
          deal.contact_ids.every((id) => id === contactId),
      )
      .map((deal) => deal.id);
    const { data: dealNotes } = await dataProvider.getList("deal_notes", {
      ...everything,
      filter: {},
    });
    await Promise.all([
      ...contactNotes.map((note) =>
        dataProvider.update("contact_notes", {
          id: note.id,
          data: emptyNote,
          previousData: note,
        }),
      ),
      ...dealNotes
        .filter((note) => soleDealIds.includes(note.deal_id))
        .map((note) =>
          dataProvider.update("deal_notes", {
            id: note.id,
            data: emptyNote,
            previousData: note,
          }),
        ),
    ]);
    return { filesRemoved: true };
  },

  takeDeal: async (dealId: Identifier): Promise<Deal> => {
    const dataProvider = getDataProvider();
    const me = await getIdentity();
    const { data: deal } = await dataProvider.getOne<Deal>("deals", {
      id: dealId,
    });
    if (deal.sales_id != null) throw new Error("lead is not available");
    const { data } = await dataProvider.update<Deal>("deals", {
      id: dealId,
      data: { sales_id: me?.id },
      previousData: deal,
    });
    return data;
  },

  sendQuote: async (
    quoteId: Identifier,
    channels: SendChannel[],
  ): Promise<Quote> => {
    const dataProvider = getDataProvider();
    if (channels.length === 0) throw new Error("choose at least one channel");
    const { data: quote } = await dataProvider.getOne<Quote>("quotes", {
      id: quoteId,
    });
    const { data: deal } = await dataProvider.getOne<Deal>("deals", {
      id: quote.deal_id,
    });
    if (!quote.is_current)
      throw new Error("only the current quote can be sent");
    if (!ETAPAS_ABIERTAS.includes(deal.stage as Etapa))
      throw new Error("lead is closed");
    const { data: queued } = await dataProvider.getList("send_queue", {
      ...ALL,
      filter: { quote_id: quoteId },
    });
    if (queued.length > 0)
      throw Object.assign(new Error("already sent"), { code: "23505" });

    for (const channel of channels) {
      await dataProvider.create("send_queue", {
        data: {
          deal_id: deal.id,
          quote_id: quoteId,
          channel,
          status: "pendiente",
          sales_id: deal.sales_id,
        },
      });
    }
    const { data: sent } = await dataProvider.update<Quote>("quotes", {
      id: quoteId,
      data: { sent_channels: channels, delivery_status: "pendiente" },
      previousData: quote,
    });
    const now = new Date().toISOString();
    await dataProvider.update("deals", {
      id: deal.id,
      data: {
        stage: "cotizado",
        amount: quote.amount,
        last_activity_at: now,
        first_response_at: deal.first_response_at ?? now,
      },
      previousData: deal,
    });

    const { data: followups } = await dataProvider.getList<Followup>(
      "followups",
      {
        ...ALL,
        filter: { deal_id: deal.id },
      },
    );
    for (const followup of followups.filter((f) =>
      ["pendiente", "vencido"].includes(f.status),
    )) {
      await dataProvider.update("followups", {
        id: followup.id,
        data: {
          status: "cancelado",
          cancel_reason: "Nueva cotización enviada",
        },
        previousData: followup,
      });
    }
    if (deal.followups_enabled) {
      const { data: templates } = await dataProvider.getList<Template>(
        "templates",
        {
          ...ALL,
          filter: { channel: channels[0], active: true },
        },
      );
      const dates = cadenceDates(new Date(), DEFAULT_CADENCE_DAYS);
      for (const [index, due] of dates.entries()) {
        await dataProvider.create("followups", {
          data: {
            deal_id: deal.id,
            step: index + 1,
            scheduled_at: due.toISOString(),
            channels,
            mode: "automatico",
            template_id: templates.length
              ? templates[index % templates.length].id
              : null,
            status: "pendiente",
            attempts: 0,
            created_at: now,
          },
        });
      }
    }
    return sent;
  },

  uploadQuotePdf: async (dealId: Identifier, file: File): Promise<string> => {
    const invalid = validateQuoteFile(file);
    if (invalid) throw Object.assign(new Error(invalid), { code: invalid });
    return quotePdfPath(dealId);
  },

  getQuotePdfUrl: async (path: string): Promise<string> => `#${path}`,
});
