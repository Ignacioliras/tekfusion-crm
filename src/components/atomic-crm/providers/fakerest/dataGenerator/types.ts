import type {
  BusinessLineConfig,
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
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
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
