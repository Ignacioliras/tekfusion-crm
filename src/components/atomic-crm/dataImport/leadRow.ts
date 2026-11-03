import type { Identifier } from "ra-core";

import {
  LINEAS_NEGOCIO,
  LINEA_INDETERMINADA,
  type LineaNegocio,
} from "../tekfusion/lineas";
import { normalizeEmail, normalizePhone } from "../tekfusion/phone";
import type { LabeledValue } from "../types";
import {
  toConfiguredValue,
  toConfiguredValues,
  toInteger,
  toIsoDate,
  toText,
} from "./parseCell";
import type { ImportRow } from "./types";

// One CSV row of the lead importer (RF-15), parsed and checked before anything
// is written. Columns: deals_sample.csv. A value given but not understood is an
// error; an empty cell falls back (stage → first stage, line → "indeterminada",
// executive → owner of the line, or unassigned).

export type LeadDraft = {
  name: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessLine: LineaNegocio;
  stage: string;
  salesId: Identifier | null;
  amount?: number;
  expectedClosingDate?: string;
  description?: string;
  categories: string[];
};

export type LeadRowError = { reason: string; args?: Record<string, string> };

export type LeadRowLookups = {
  dealStages: LabeledValue[];
  dealCategories: LabeledValue[];
  /** Users by lower-cased e-mail. */
  salesByEmail: Map<string, Identifier>;
  /** Owner of each business line. */
  lineOwners: Map<string, Identifier | null | undefined>;
};

const LINE_OPTIONS: LabeledValue[] = LINEAS_NEGOCIO.map(({ value, label }) => ({
  value,
  label,
}));

const error = (reason: string, value?: string): { error: LeadRowError } => ({
  error: {
    reason: `crm.data_import.report.reasons.${reason}`,
    args: value === undefined ? undefined : { value },
  },
});

export const parseLeadRow = (
  row: ImportRow,
  { dealStages, dealCategories, salesByEmail, lineOwners }: LeadRowLookups,
): { draft: LeadDraft } | { error: LeadRowError } => {
  const name = toText(row.name);
  if (!name) return error("missing_name");

  const rawEmail = toText(row.email);
  const email = normalizeEmail(rawEmail);
  if (rawEmail && !email) return error("invalid_email", rawEmail);

  const rawPhone = toText(row.phone);
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone) return error("invalid_phone", rawPhone);

  const rawLine = toText(row.business_line);
  const businessLine = (toConfiguredValue(rawLine ?? null, LINE_OPTIONS) ??
    (rawLine ? undefined : LINEA_INDETERMINADA)) as LineaNegocio | undefined;
  if (!businessLine) return error("unknown_business_line", rawLine);

  const rawStage = toText(row.stage);
  const stage = rawStage
    ? toConfiguredValue(rawStage, dealStages)
    : dealStages[0]?.value;
  if (!stage) return error("unknown_stage", rawStage);

  const rawSalesEmail = toText(row.sales_email);
  const salesId = rawSalesEmail
    ? salesByEmail.get(rawSalesEmail.toLowerCase())
    : (lineOwners.get(businessLine) ?? null);
  if (salesId === undefined) return error("unknown_sales", rawSalesEmail);

  return {
    draft: {
      name,
      companyName: toText(row.company),
      firstName: toText(row.contact_first_name),
      lastName: toText(row.contact_last_name),
      email,
      phone,
      businessLine,
      stage,
      salesId,
      // amount lands in a bigint column, which rejects "4500.50"
      amount: toInteger(row.amount),
      expectedClosingDate: toIsoDate(row.expected_closing_date),
      description: toText(row.description),
      categories: toConfiguredValues(row.categories, dealCategories),
    },
  };
};
