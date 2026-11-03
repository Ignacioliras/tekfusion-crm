import type {
  BusinessLineConfig,
  Company,
  Contact,
  ContactNote,
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
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
