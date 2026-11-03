import { useCallback, useRef } from "react";
import { useDataProvider, type DataProvider } from "ra-core";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, Deal } from "../types";
import {
  findContact,
  indexLead,
  loadLeadIndex,
  type LeadIndex,
} from "./leadIndex";
import { parseLeadRow, type LeadDraft } from "./leadRow";
import { useCompanyResolver } from "./useCompanyResolver";
import type {
  ImportBatchReport,
  ImportRow,
  ImportRowIssue,
  ProcessImportBatch,
} from "./types";

/** One CSV row, with the values needed before its deal can be created. */
type DealRow = {
  row: ImportRow;
  line: number;
  draft: LeadDraft;
  stage: string;
};

/**
 * Imports leads (RF-15): one deal per CSV row, with its contact, company,
 * business line, stage and executive (columns: deals_sample.csv), marked as
 * `migracion`. Rows are checked first (leadRow.ts): one with a value that is
 * not understood is reported as an error. A row whose contact (same e-mail or
 * phone, docs/03) already has an open lead is left out and reported as a
 * duplicate; when that contact's last lead is closed, the new one links to it.
 * Matching companies and contacts are reused, unknown ones are created.
 */
export function useDealImport(): ProcessImportBatch {
  const { dealCategories, dealStages } = useConfigurationContext();
  const dataProvider = useDataProvider();
  const getCompanies = useCompanyResolver();
  const indexRef = useRef<LeadIndex | null>(null);

  return useCallback(
    async (batch, context): Promise<ImportBatchReport> => {
      // A new import starts from what the database holds now
      if (!indexRef.current || !context || context.isFirstBatch) {
        indexRef.current = await loadLeadIndex(dataProvider);
      }
      const index = indexRef.current;
      const firstLine = context?.firstLine ?? 2;

      const issues: ImportRowIssue[] = [];
      const valid: DealRow[] = [];
      batch.forEach((row, position) => {
        const line = firstLine + position;
        const parsed = parseLeadRow(row, {
          dealStages,
          dealCategories,
          salesByEmail: index.salesByEmail,
          lineOwners: index.lineOwners,
        });
        if ("error" in parsed) {
          issues.push({ line, kind: "error", ...parsed.error });
        } else {
          valid.push({
            row,
            line,
            draft: parsed.draft,
            stage: parsed.draft.stage,
          });
        }
      });

      const [companies, indexes] = await Promise.all([
        getCompanies(
          valid
            .map(({ draft }) => draft.companyName)
            .filter((name): name is string => name !== undefined),
        ),
        appendedIndexes(valid, dataProvider),
      ]);

      // One row at a time: a contact repeated inside the batch must see the
      // lead its first row created.
      let created = 0;
      for (const { row, line, draft } of valid) {
        const contactId = findContact(index, draft.email, draft.phone);
        const openDeal =
          contactId === undefined
            ? undefined
            : index.openDealByContact.get(String(contactId));
        if (openDeal) {
          issues.push({
            line,
            kind: "duplicate",
            reason: "crm.data_import.report.reasons.duplicate",
            args: { lead: openDeal.name },
          });
          continue;
        }
        try {
          const companyId = draft.companyName
            ? companies.get(draft.companyName)?.id
            : undefined;
          const contact = await resolveContact(
            dataProvider,
            index,
            contactId,
            draft,
            companyId,
          );
          const now = new Date().toISOString();
          const { data: deal } = await dataProvider.create<Deal>("deals", {
            data: {
              name: draft.name,
              company_id: companyId,
              contact_ids: contact ? [contact.id] : [],
              categories: draft.categories,
              stage: draft.stage,
              description: draft.description,
              amount: draft.amount,
              expected_closing_date: draft.expectedClosingDate,
              sales_id: draft.salesId,
              index: indexes.get(row) ?? 0,
              created_at: now,
              updated_at: now,
              business_line: draft.businessLine,
              origin_channel: "migracion",
              last_activity_at: now,
              followups_enabled: true,
              previous_deal_id: contact
                ? index.closedDealByContact.get(String(contact.id))?.id
                : undefined,
            },
          });
          if (contact) indexLead(index, contact, deal);
          created += 1;
        } catch (cause) {
          console.error("Failed to import a row", cause);
          issues.push({
            line,
            kind: "error",
            reason: "crm.data_import.report.reasons.refused",
          });
        }
      }
      return { created, issues };
    },
    [dataProvider, dealCategories, dealStages, getCompanies],
  );
}

/** The row's contact: the matching one, a new one, or none without e-mail or phone. */
const resolveContact = async (
  dataProvider: DataProvider,
  index: LeadIndex,
  contactId: Contact["id"] | undefined,
  draft: LeadDraft,
  companyId: Contact["company_id"] | undefined,
): Promise<Pick<Contact, "id" | "email_jsonb" | "phone_jsonb"> | undefined> => {
  if (contactId !== undefined) {
    const { data } = await dataProvider.getOne<Contact>("contacts", {
      id: contactId,
    });
    return data;
  }
  if (!draft.email && !draft.phone) return undefined;
  const now = new Date().toISOString();
  const { data } = await dataProvider.create<Contact>("contacts", {
    data: {
      first_name: draft.firstName ?? "",
      last_name: draft.lastName ?? "",
      email_jsonb: draft.email ? [{ email: draft.email, type: "Work" }] : [],
      phone_jsonb: draft.phone ? [{ number: draft.phone, type: "Work" }] : [],
      company_id: companyId,
      sales_id: draft.salesId,
      first_seen: now,
      last_seen: now,
      status: "warm",
      tags: [],
      has_newsletter: false,
    },
  });
  indexLead(index, data);
  return data;
};

/**
 * One distinct index per imported deal, appended below the deals already in its
 * stage and keeping the CSV row order.
 *
 * The Kanban board sorts each column on `index`, and its drag handler shifts the
 * indexes of the cards around the drop target. A column whose deals all share
 * `index: 0` therefore cannot be reordered — the drop writes `index: 0` again
 * and the card snaps back — and its order is whatever the backend returns.
 */
const appendedIndexes = async (
  rows: DealRow[],
  dataProvider: DataProvider,
): Promise<Map<ImportRow, number>> => {
  const stages = [
    ...new Set(
      rows
        .map(({ stage }) => stage)
        .filter((stage): stage is string => stage !== undefined),
    ),
  ];
  const lastIndexes = new Map(
    await Promise.all(
      stages.map(
        async (stage) =>
          [stage, await lastIndexOf(stage, dataProvider)] as const,
      ),
    ),
  );

  return new Map(
    stages.flatMap((stage) => {
      const firstIndex = (lastIndexes.get(stage) ?? -1) + 1;
      return rows
        .filter((candidate) => candidate.stage === stage)
        .map(({ row }, position) => [row, firstIndex + position] as const);
    }),
  );
};

/** Highest index currently used in a stage, or -1 when it holds no deal. */
const lastIndexOf = async (stage: string, dataProvider: DataProvider) => {
  const { data } = await dataProvider.getList("deals", {
    filter: { stage },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "index", order: "DESC" },
  });
  return data[0]?.index ?? -1;
};
