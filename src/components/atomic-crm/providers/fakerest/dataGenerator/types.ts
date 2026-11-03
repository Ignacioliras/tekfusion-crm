import type {
  BusinessLineConfig,
  Company,
  Contact,
  ContactNote,
  DashboardMonthlyRow,
  Alert,
  AuditLogEntry,
  Deal,
  DealNote,
  Followup,
  LostReason,
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
  alerts: Alert[];
  audit_log: AuditLogEntry[];
  send_queue: Array<{ id: number; quote_id: number; channel: string }>;
  // A view in Supabase; FakeRest has no views, so it stays empty in the demo.
  dashboard_monthly: DashboardMonthlyRow[];
  sales_ranking: SalesRankingRow[];
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
