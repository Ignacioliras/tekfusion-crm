import type {
  BusinessLineConfig,
  Company,
  Contact,
  ContactNote,
  DashboardDailyRow,
  Alert,
  AuditLogEntry,
  Deal,
  DealNote,
  Followup,
  LostReason,
  QuickReply,
  Quote,
  Template,
  Sale,
  SalesAbsence,
  SalesRankingRow,
  Tag,
  Task,
} from "../../../types";
import type { ConfigurationContextValue } from "../../../root/ConfigurationContext";

export interface Db {
  companies: Company[];
  contacts: Contact[];
  contact_notes: ContactNote[];
  deals: Deal[];
  deal_notes: DealNote[];
  sales: Sale[];
  tags: Tag[];
  tasks: Task[];
  // FakeRest keys every record by id: business lines use their code as id.
  business_lines: Array<BusinessLineConfig & { id: string }>;
  sales_absences: SalesAbsence[];
  lost_reasons: LostReason[];
  quotes: Quote[];
  followups: Followup[];
  templates: Template[];
  quick_replies: QuickReply[];
  alerts: Alert[];
  audit_log: AuditLogEntry[];
  send_queue: Array<{ id: number; quote_id: number; channel: string }>;
  // A view in Supabase; FakeRest has no views, so it stays empty in the demo.
  dashboard_daily: DashboardDailyRow[];
  sales_ranking: SalesRankingRow[];
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
