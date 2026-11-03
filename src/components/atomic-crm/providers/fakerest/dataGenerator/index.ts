import { generateCompanies } from "./companies";
import { generateContactNotes } from "./contactNotes";
import { generateContacts } from "./contacts";
import { generateDealNotes } from "./dealNotes";
import { generateDeals } from "./deals";
import { finalize } from "./finalize";
import { generateSales } from "./sales";
import { generateTags } from "./tags";
import { generateTasks } from "./tasks";
import type { Db } from "./types";
import { DEFAULT_LOST_REASONS, DEFAULT_TEMPLATES } from "./leadDefaults";
import { LINEAS_NEGOCIO, LINEA_INDETERMINADA } from "../../../tekfusion/lineas";

export default (): Db => {
  const db = {} as Db;
  db.sales = generateSales(db);
  db.tags = generateTags(db);
  db.companies = generateCompanies(db);
  db.contacts = generateContacts(db);
  db.contact_notes = generateContactNotes(db);
  db.deals = generateDeals(db);
  db.deal_notes = generateDealNotes(db);
  db.tasks = generateTasks(db);
  // Lines owned by the first two generated executives, each the other's substitute.
  db.business_lines = LINEAS_NEGOCIO.filter(
    (linea) => linea.value !== LINEA_INDETERMINADA,
  ).map((linea, index) => ({
    id: linea.value,
    code: linea.value,
    name: linea.label,
    owner_sales_id: (index % 2) + 1,
    substitute_sales_id: ((index + 1) % 2) + 1,
    keywords: [...linea.keywords],
  }));
  db.sales_absences = [];
  db.lost_reasons = DEFAULT_LOST_REASONS.map((name, index) => ({
    id: index + 1,
    name,
    active: true,
    position: index,
  }));
  db.templates = DEFAULT_TEMPLATES.map((template, index) => ({
    id: index + 1,
    active: true,
    ...template,
  }));
  db.quotes = [];
  db.followups = [];
  db.alerts = [];
  db.audit_log = [];
  db.send_queue = [];
  db.dashboard_monthly = [];
  db.configuration = [
    {
      id: 1,
      config: {} as Db["configuration"][number]["config"],
    },
  ];
  finalize(db);

  return db;
};
