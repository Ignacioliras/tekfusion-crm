import type { DataProvider, Identifier, RaRecord } from "ra-core";

import { ETAPAS_ABIERTAS } from "../tekfusion/estados";
import { normalizeEmail, normalizePhone } from "../tekfusion/phone";
import type { Contact, Deal, Sale } from "../types";

// What the lead importer needs to know about the existing data, loaded once
// per import and kept up to date as rows are created, so a contact repeated
// inside the CSV is caught too. Dedupe key (docs/03): normalized e-mail or
// phone of a contact.
// ponytail: loads every visible contact and lead once per import; fine for
// TekFusion's few thousand records, move the lookup to an RPC past ~50k.

export type LeadIndex = {
  contactByEmail: Map<string, Identifier>;
  contactByPhone: Map<string, Identifier>;
  /** Open lead (nuevo / contactado / cotizado, not archived) of each contact. */
  openDealByContact: Map<string, Deal>;
  /** Most recent closed lead of each contact: a new lead links to it. */
  closedDealByContact: Map<string, Deal>;
  salesByEmail: Map<string, Identifier>;
  lineOwners: Map<string, Identifier | null | undefined>;
};

const PAGE = 1000; // PostgREST max_rows (supabase/config.toml)

const fetchAll = async <T extends RaRecord>(
  dataProvider: DataProvider,
  resource: string,
  sortField = "id",
): Promise<T[]> => {
  const records: T[] = [];
  for (let page = 1; ; page++) {
    const { data } = await dataProvider.getList<T>(resource, {
      filter: {},
      pagination: { page, perPage: PAGE },
      sort: { field: sortField, order: "ASC" },
    });
    records.push(...data);
    if (data.length < PAGE) return records;
  }
};

export const isOpenDeal = (deal: Pick<Deal, "stage" | "archived_at">) =>
  !deal.archived_at &&
  (ETAPAS_ABIERTAS as readonly string[]).includes(deal.stage);

/** Records a contact and one of its leads in the index. */
export const indexLead = (
  index: LeadIndex,
  contact: Pick<Contact, "id" | "email_jsonb" | "phone_jsonb">,
  deal?: Deal,
) => {
  for (const { email } of contact.email_jsonb ?? []) {
    const key = normalizeEmail(email);
    if (key && !index.contactByEmail.has(key))
      index.contactByEmail.set(key, contact.id);
  }
  for (const { number } of contact.phone_jsonb ?? []) {
    const key = normalizePhone(number);
    if (key && !index.contactByPhone.has(key))
      index.contactByPhone.set(key, contact.id);
  }
  if (!deal) return;
  const key = String(contact.id);
  if (isOpenDeal(deal)) {
    index.openDealByContact.set(key, deal);
  } else {
    // deals are read oldest first, so the last one written is the most recent
    index.closedDealByContact.set(key, deal);
  }
};

export const loadLeadIndex = async (
  dataProvider: DataProvider,
): Promise<LeadIndex> => {
  const [contacts, deals, sales, lines] = await Promise.all([
    fetchAll<Contact>(dataProvider, "contacts"),
    fetchAll<Deal>(dataProvider, "deals", "created_at"),
    fetchAll<Sale>(dataProvider, "sales"),
    dataProvider
      .getList("business_lines", {
        filter: {},
        pagination: { page: 1, perPage: 10 },
        sort: { field: "code", order: "ASC" },
      })
      .then(({ data }) => data),
  ]);

  const index: LeadIndex = {
    contactByEmail: new Map(),
    contactByPhone: new Map(),
    openDealByContact: new Map(),
    closedDealByContact: new Map(),
    salesByEmail: new Map(
      sales
        .filter((sale) => !sale.disabled)
        .map((sale) => [sale.email.toLowerCase(), sale.id]),
    ),
    lineOwners: new Map(lines.map((line) => [line.code, line.owner_sales_id])),
  };
  const contactsById = new Map(
    contacts.map((contact) => [String(contact.id), contact]),
  );
  for (const contact of contacts) indexLead(index, contact);
  for (const deal of deals) {
    for (const contactId of deal.contact_ids ?? []) {
      const contact = contactsById.get(String(contactId));
      if (contact) indexLead(index, contact, deal);
    }
  }
  return index;
};

/** The contact a row names, by e-mail first, then by phone. */
export const findContact = (
  index: LeadIndex,
  email: string | undefined,
  phone: string | undefined,
): Identifier | undefined =>
  (email && index.contactByEmail.get(email)) ||
  (phone && index.contactByPhone.get(phone)) ||
  undefined;
