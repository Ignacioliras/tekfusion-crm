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
  WaConversation,
  WaMessage,
} from "../../types";
import type { DayRange } from "../../management-dashboard/metrics";
import {
  summarizeDashboard,
  summarizeSalesRanking,
} from "../../management-dashboard/summary";
import { ETAPAS_ABIERTAS, type Etapa } from "../../tekfusion/estados";
import { quotePdfPath, validateQuoteFile } from "../commons/quoteFile";
import type { WaConnectionStatus } from "../supabase/dataProvider";

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
// Longest text WhatsApp accepts in one message (send_wa_message).
const MAX_WA_TEXT_LENGTH = 4096;

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

  /**
   * In-memory mirror of anonymize_contact() (RF-17); no files to remove here.
   * Also cancels the pending follow-ups of the leads that only have this
   * contact and strips and archives its WhatsApp conversations (phone
   * anon-<id>, texts).
   */
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
    if (contact.anonymized_at) return { filesRemoved: true };
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
        anonymized_at: new Date().toISOString(),
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
    const { data: followups } = await dataProvider.getList<Followup>(
      "followups",
      { ...everything, filter: {} },
    );
    const { data: conversations } = await dataProvider.getList<WaConversation>(
      "wa_conversations",
      {
        ...everything,
        filter: { contact_id: contactId },
      },
    );
    const messages = (
      await Promise.all(
        conversations.map((c) =>
          dataProvider.getList<WaMessage>("wa_messages", {
            ...everything,
            filter: { conversation_id: c.id },
          }),
        ),
      )
    ).flatMap((r) => r.data);
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
      ...followups
        .filter(
          (f) => soleDealIds.includes(f.deal_id) && f.status === "pendiente",
        )
        .map((f) =>
          dataProvider.update("followups", {
            id: f.id,
            data: { status: "cancelado", cancel_reason: "anonimizado" },
            previousData: f,
          }),
        ),
      ...conversations.map((c) =>
        dataProvider.update("wa_conversations", {
          id: c.id,
          data: { phone: `anon-${c.id}`, archived: true },
          previousData: c,
        }),
      ),
      ...messages.map((m) =>
        dataProvider.update("wa_messages", {
          id: m.id,
          data: { text: null },
          previousData: m,
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

  /** In-memory mirror of take_wa_conversation(): unassigned, not archived. */
  takeWaConversation: async (
    conversationId: Identifier,
  ): Promise<WaConversation> => {
    const dataProvider = getDataProvider();
    const me = await getIdentity();
    const { data: conversation } = await dataProvider.getOne<WaConversation>(
      "wa_conversations",
      { id: conversationId },
    );
    if (conversation.sales_id != null || conversation.archived)
      throw new Error("conversation is not available");
    const { data } = await dataProvider.update<WaConversation>(
      "wa_conversations",
      {
        id: conversationId,
        data: { sales_id: me?.id },
        previousData: conversation,
      },
    );
    return data;
  },

  /** In-memory mirror of mark_wa_conversation_read(): unassigned stays new. */
  markWaConversationRead: async (
    conversationId: Identifier,
  ): Promise<number> => {
    const dataProvider = getDataProvider();
    const { data: conversation } = await dataProvider.getOne<WaConversation>(
      "wa_conversations",
      { id: conversationId },
    );
    if (conversation.sales_id == null) return 0;
    const { data: messages } = await dataProvider.getList<WaMessage>(
      "wa_messages",
      { ...ALL, filter: { conversation_id: conversationId } },
    );
    const unread = messages.filter(
      (m) => m.direction === "entrante" && m.status !== "leido",
    );
    await Promise.all(
      unread.map((m) =>
        dataProvider.update("wa_messages", {
          id: m.id,
          data: { status: "leido" },
          previousData: m,
        }),
      ),
    );
    await dataProvider.update("wa_conversations", {
      id: conversationId,
      data: { unread_count: 0 },
      previousData: conversation,
    });
    return unread.length;
  },

  /**
   * In-memory mirror of send_wa_message(): owner or manager, assigned (an
   * unassigned chat is taken first, managers too), not archived, 1..4096
   * characters. ponytail: no 30-per-minute cap and no send_queue row,
   * the demo never sends anything.
   */
  sendWaMessage: async (
    conversationId: Identifier,
    text: string,
  ): Promise<WaMessage> => {
    const dataProvider = getDataProvider();
    const fail = (message: string, code: string) =>
      Object.assign(new Error(message), { code });
    const me = await getIdentity();
    const { data: conversation } = await dataProvider
      .getOne<WaConversation>("wa_conversations", { id: conversationId })
      .catch(() => {
        throw fail("conversation does not exist", "P0002");
      });
    const isManager = await canAccess({
      resource: "wa_conversations",
      action: "list_all",
    });
    if (conversation.sales_id == null)
      throw fail("conversation is unassigned: take it before writing", "42501");
    if (!isManager && conversation.sales_id !== me?.id)
      throw fail("conversation is not assigned to you", "42501");
    if (conversation.archived) throw fail("conversation is archived", "P0002");
    const body = text.trim();
    if (body === "" || body.length > MAX_WA_TEXT_LENGTH)
      throw fail("the message text is empty or too long", "22023");

    const now = new Date().toISOString();
    const jobId = `crm-${crypto.randomUUID()}`;
    const { data } = await dataProvider.create<WaMessage>("wa_messages", {
      data: {
        conversation_id: conversationId,
        deal_id: conversation.active_deal_id ?? null,
        wa_message_id: `pending:${jobId}`,
        direction: "saliente",
        type: "texto",
        text: body,
        status: "pendiente",
        from_me_phone: false,
        origin: "crm",
        author_sales_id: me?.id ?? null,
        job_id: jobId,
        sent_at: now,
        created_at: now,
      },
    });
    await dataProvider.update("wa_conversations", {
      id: conversationId,
      data: { last_message_at: now },
      previousData: conversation,
    });
    return data;
  },

  /** wa_connection_status() in the demo: there is no instance, always connected. */
  getWaConnectionStatus: async (): Promise<WaConnectionStatus> => ({
    connected: true,
    updated_at: new Date().toISOString(),
  }),

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
