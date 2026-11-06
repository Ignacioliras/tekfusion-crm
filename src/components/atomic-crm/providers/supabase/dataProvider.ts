import { supabaseDataProvider } from "ra-supabase-core";
import {
  withLifecycleCallbacks,
  type DataProvider,
  type GetListParams,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import type {
  ContactNote,
  DashboardSummaryRow,
  Deal,
  DealNote,
  Quote,
  SalesRankingSummaryRow,
  SendChannel,
  RAFile,
  Sale,
  SalesFormData,
  SearchResourceName,
  SearchResult,
  SignUpData,
} from "../../types";
import type { DayRange } from "../../management-dashboard/metrics";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { ATTACHMENTS_BUCKET } from "../commons/attachments";
import {
  QUOTES_BUCKET,
  quotePdfPath,
  validateQuoteFile,
} from "../commons/quoteFile";
import { getIsInitialized } from "./authProvider";
import { searchDealCategories } from "./searchDealCategories";
import {
  getSigner as getSignerFor,
  signRecordFiles,
  signUrl,
} from "./signedUrls";
import { getSupabaseClient } from "./supabase";

// The app's signer: remembers the signed URLs for an hour, reset on logout.
const getSigner = () => getSignerFor(getSupabaseClient());

const getBaseDataProvider = () =>
  supabaseDataProvider({
    instanceUrl: import.meta.env.VITE_SUPABASE_URL,
    apiKey: import.meta.env.VITE_SB_PUBLISHABLE_KEY,
    supabaseClient: getSupabaseClient(),
    sortOrder: "asc,desc.nullslast" as any,
    // business_lines is keyed by its enum code and the dashboard_daily view
    // by its grouping columns; every other table uses id.
    primaryKeys: new Map([
      ["business_lines", ["code"]],
      ["dashboard_daily", ["day", "business_line", "origin_channel"]],
      ["sales_ranking", ["day", "sales_id"]],
    ]),
  });

const processCompanyLogo = async (params: any) => {
  const logo = params.data.logo;

  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo, "companies");
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

const getDataProviderWithCustomMethods = () => {
  const baseDataProvider = getBaseDataProvider();

  return {
    ...baseDataProvider,
    async getList(resource: string, params: GetListParams) {
      if (resource === "companies") {
        return baseDataProvider.getList("companies_summary", params);
      }
      if (resource === "contacts") {
        return baseDataProvider.getList("contacts_summary", params);
      }
      if (resource === "activity_log") {
        const { data, total } = await baseDataProvider.getList(
          "activity_log",
          params,
        );
        // Rename snake_case view columns to camelCase to match Activity type;
        // the embedded records carry files of the (private) bucket.
        const sign = getSigner();
        return {
          data: await Promise.all(
            data.map(async (row: any) => ({
              ...row,
              company: row.company
                ? await signRecordFiles(row.company, ["logo"], sign)
                : row.company,
              contact: row.contact
                ? await signRecordFiles(row.contact, ["avatar"], sign)
                : row.contact,
              contactNote: row.contact_note
                ? await signRecordFiles(row.contact_note, ["attachments"], sign)
                : undefined,
              dealNote: row.deal_note
                ? await signRecordFiles(row.deal_note, ["attachments"], sign)
                : undefined,
              contact_note: undefined,
              deal_note: undefined,
            })),
          ),
          total,
        };
      }

      return baseDataProvider.getList(resource, params);
    },
    async getOne(resource: string, params: any) {
      if (resource === "companies") {
        return baseDataProvider.getOne("companies_summary", params);
      }
      if (resource === "contacts") {
        return baseDataProvider.getOne("contacts_summary", params);
      }

      return baseDataProvider.getOne(resource, params);
    },

    async signUp({ email, password, first_name, last_name }: SignUpData) {
      const response = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name,
            last_name,
          },
        },
      });

      if (!response.data?.user || response.error) {
        console.error("signUp.error", response.error);
        throw new Error(response?.error?.message || "Failed to create account");
      }

      // Update the is initialized cache
      (getIsInitialized as any)._is_initialized_cache = true;

      return {
        id: response.data.user.id,
        email,
        password,
      };
    },
    async salesCreate(body: SalesFormData) {
      const { data, error } = await getSupabaseClient().functions.invoke<{
        data: Sale;
      }>("users", {
        method: "POST",
        body,
      });

      if (!data || error) {
        console.error("salesCreate.error", error);
        const errorDetails = await (async () => {
          try {
            return (await error?.context?.json()) ?? {};
          } catch {
            return {};
          }
        })();
        throw Object.assign(
          new Error(errorDetails?.message || "Failed to create the user"),
          { code: errorDetails?.code, email: errorDetails?.email },
        );
      }

      return data.data;
    },
    async salesUpdate(
      id: Identifier,
      data: Partial<Omit<SalesFormData, "password">>,
    ) {
      const {
        email,
        secondary_emails,
        first_name,
        last_name,
        administrator,
        role,
        avatar,
        disabled,
      } = data;

      const { data: updatedData, error } =
        await getSupabaseClient().functions.invoke<{
          data: Sale;
        }>("users", {
          method: "PATCH",
          body: {
            sales_id: id,
            email,
            secondary_emails,
            first_name,
            last_name,
            administrator,
            role,
            disabled,
            avatar,
          },
        });

      if (!updatedData || error) {
        console.error("salesUpdate.error", error);
        const errorDetails = await (async () => {
          try {
            return (await error?.context?.json()) ?? {};
          } catch {
            return {};
          }
        })();
        throw Object.assign(
          new Error(
            errorDetails?.message || "Failed to update account manager",
          ),
          { code: errorDetails?.code, email: errorDetails?.email },
        );
      }

      return updatedData.data;
    },
    /** Records a CSV export with its author (RPC log_export, docs/08). */
    async logExport(
      resource: string,
      rowCount: number,
      filters: Record<string, unknown>,
    ): Promise<void> {
      const { error } = await getSupabaseClient().rpc("log_export", {
        resource,
        row_count: rowCount,
        filters,
      });
      if (error)
        throw Object.assign(new Error(error.message), { code: error.code });
    },
    /**
     * "Anonimizar contacto" (RF-17, RPC anonymize_contact; managers only), then
     * removes the files its notes held. A failed file removal does not undo the
     * anonymization: it is reported with filesRemoved = false.
     */
    async anonymizeContact(
      contactId: Identifier,
    ): Promise<{ filesRemoved: boolean }> {
      const { data, error } = await getSupabaseClient().rpc(
        "anonymize_contact",
        { contact_id: contactId },
      );
      if (error)
        throw Object.assign(new Error(error.message), { code: error.code });
      const paths = (data ?? []) as string[];
      if (paths.length === 0) return { filesRemoved: true };
      const { error: storageError } = await getSupabaseClient()
        .storage.from(ATTACHMENTS_BUCKET)
        .remove(paths);
      return { filesRemoved: !storageError };
    },
    /** Dashboard totals of a range, summed in the database (RPC dashboard_summary). */
    async getDashboardSummary(range: DayRange): Promise<DashboardSummaryRow[]> {
      const { data, error } = await getSupabaseClient().rpc(
        "dashboard_summary",
        { date_from: range.from, date_to: range.to },
      );
      if (error)
        throw Object.assign(new Error(error.message), { code: error.code });
      return (data ?? []) as DashboardSummaryRow[];
    },
    /** Ranking of a range, one row per executive (RPC sales_ranking_summary). */
    async getSalesRankingSummary(
      range: DayRange,
    ): Promise<SalesRankingSummaryRow[]> {
      const { data, error } = await getSupabaseClient().rpc(
        "sales_ranking_summary",
        { date_from: range.from, date_to: range.to },
      );
      if (error)
        throw Object.assign(new Error(error.message), { code: error.code });
      return (data ?? []) as SalesRankingSummaryRow[];
    },
    /** "Tomar": an executive takes an unassigned lead (RPC take_deal). */
    async takeDeal(dealId: Identifier): Promise<Deal> {
      const { data, error } = await getSupabaseClient().rpc("take_deal", {
        deal_id: dealId,
      });
      if (error)
        throw Object.assign(new Error(error.message), { code: error.code });
      return data as Deal;
    },
    /** "Enviar cotización" (RF-06): enqueue, move to cotizado, schedule follow-ups. */
    async sendQuote(
      quoteId: Identifier,
      channels: SendChannel[],
    ): Promise<Quote> {
      const { data, error } = await getSupabaseClient().rpc("send_quote", {
        quote_id: quoteId,
        channels,
      });
      if (error)
        throw Object.assign(new Error(error.message), { code: error.code });
      return data as Quote;
    },
    /** Uploads a quote PDF under deals/<id>/<uuid>.pdf; returns its path. */
    async uploadQuotePdf(dealId: Identifier, file: File): Promise<string> {
      const invalid = validateQuoteFile(file);
      if (invalid) throw Object.assign(new Error(invalid), { code: invalid });
      const path = quotePdfPath(dealId);
      const { error } = await getSupabaseClient()
        .storage.from(QUOTES_BUCKET)
        .upload(path, file, { contentType: "application/pdf" });
      if (error) throw new Error(error.message);
      return path;
    },
    /** Signed URL (60 min) of a quote PDF; the storage policy checks the lead. */
    async getQuotePdfUrl(path: string): Promise<string> {
      const { data, error } = await getSupabaseClient()
        .storage.from(QUOTES_BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (error || !data) throw new Error(error?.message ?? "No signed URL");
      return data.signedUrl;
    },
    /** "Dar de baja": disables the user through the users Edge Function (docs/08). */
    async salesOffboard(id: Identifier): Promise<void> {
      const { error } = await getSupabaseClient().functions.invoke("users", {
        method: "DELETE",
        body: { sales_id: id },
      });
      if (error) {
        console.error("salesOffboard.error", error);
        const details = await error?.context?.json?.().catch(() => ({}));
        throw Object.assign(
          new Error(details?.message || "Failed to offboard the user"),
          { code: details?.code },
        );
      }
    },
    async updatePassword(id: Identifier) {
      const { data: passwordUpdated, error } =
        await getSupabaseClient().functions.invoke<boolean>("update_password", {
          method: "PATCH",
          body: {
            sales_id: id,
          },
        });

      if (!passwordUpdated || error) {
        console.error("update_password.error", error);
        throw new Error("Failed to update password");
      }

      return passwordUpdated;
    },
    async unarchiveDeal(deal: Deal) {
      // get all deals where stage is the same as the deal to unarchive
      const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
        filter: { stage: deal.stage },
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "index", order: "ASC" },
      });

      // set index for each deal starting from 1, if the deal to unarchive is found, set its index to the last one
      const updatedDeals = deals.map((d, index) => ({
        ...d,
        index: d.id === deal.id ? 0 : index + 1,
        archived_at: d.id === deal.id ? null : d.archived_at,
      }));

      return await Promise.all(
        updatedDeals.map((updatedDeal) =>
          baseDataProvider.update("deals", {
            id: updatedDeal.id,
            data: updatedDeal,
            previousData: deals.find((d) => d.id === updatedDeal.id),
          }),
        ),
      );
    },
    async isInitialized() {
      return getIsInitialized();
    },
    async globalSearch(
      query: string,
      resources: readonly SearchResourceName[],
      maxResults: number,
    ): Promise<SearchResult[]> {
      const { data, error } = await getSupabaseClient().rpc("global_search", {
        query,
        resources,
        max_results: maxResults,
      });
      if (error) {
        console.error("global_search.error", error);
        throw new Error("Failed to search");
      }
      return data ?? [];
    },
    async mergeContacts(sourceId: Identifier, targetId: Identifier) {
      const { data, error } = await getSupabaseClient().functions.invoke(
        "merge_contacts",
        {
          method: "POST",
          body: { loserId: sourceId, winnerId: targetId },
        },
      );

      if (error) {
        console.error("merge_contacts.error", error);
        throw new Error("Failed to merge contacts");
      }

      return data;
    },
    async getConfiguration(): Promise<ConfigurationContextValue> {
      const { data } = await baseDataProvider.getOne("configuration", {
        id: 1,
      });
      const config = data.config as ConfigurationContextValue;
      // Uploaded logos live in the private bucket; the default ones are assets.
      const sign = getSigner();
      return {
        ...config,
        lightModeLogo: await signUrl(config.lightModeLogo, sign),
        darkModeLogo: await signUrl(config.darkModeLogo, sign),
      };
    },
    async updateConfiguration(
      config: ConfigurationContextValue,
    ): Promise<ConfigurationContextValue> {
      const { data } = await baseDataProvider.update("configuration", {
        id: 1,
        data: { config },
        previousData: { id: 1 },
      });
      return data.config as ConfigurationContextValue;
    },
  } satisfies DataProvider;
};

export type CrmDataProvider = ReturnType<
  typeof getDataProviderWithCustomMethods
>;

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo, "config");
    return logo.src;
  }
  return logo?.src ?? "";
};

const lifeCycleCallbacks: ResourceCallbacks[] = [
  {
    resource: "configuration",
    beforeUpdate: async (params) => {
      const config = params.data.config;
      if (config) {
        config.lightModeLogo = await processConfigLogo(config.lightModeLogo);
        config.darkModeLogo = await processConfigLogo(config.darkModeLogo);
      }
      return params;
    },
  },
  // Files are stored under the folder of their owner: the attachments_select
  // policy reads the lead or contact id out of the path.
  {
    resource: "contact_notes",
    beforeSave: async (data: ContactNote, _, __) => {
      if (data.attachments) {
        data.attachments = await Promise.all(
          data.attachments.map((fi) =>
            uploadToBucket(fi, `contacts/${data.contact_id}`),
          ),
        );
      }
      return data;
    },
    afterRead: (note: ContactNote) =>
      signRecordFiles(note, ["attachments"], getSigner()),
  },
  {
    resource: "deal_notes",
    beforeSave: async (data: DealNote, _, __) => {
      if (data.attachments) {
        data.attachments = await Promise.all(
          data.attachments.map((fi) =>
            uploadToBucket(fi, `deals/${data.deal_id}`),
          ),
        );
      }
      return data;
    },
    afterRead: (note: DealNote) =>
      signRecordFiles(note, ["attachments"], getSigner()),
  },
  {
    resource: "sales",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["first_name", "last_name"])(params);
    },
    beforeSave: async (data: Sale, _, __) => {
      if (data.avatar) {
        await uploadToBucket(data.avatar, "sales");
      }
      return data;
    },
    afterRead: (sale: Sale) => signRecordFiles(sale, ["avatar"], getSigner()),
  },
  {
    resource: "contacts",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "first_name",
        "last_name",
        "company_name",
        "title",
        "email",
        "phone",
        "background",
      ])(params);
    },
    afterRead: (contact: Record<string, any>) =>
      signRecordFiles(contact, ["avatar"], getSigner()),
  },
  {
    resource: "companies",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "name",
        "phone_number",
        "website",
        "zipcode",
        "city",
        "state_abbr",
      ])(params);
    },
    beforeCreate: async (params) => {
      const createParams = await processCompanyLogo(params);

      return {
        ...createParams,
        data: {
          created_at: new Date().toISOString(),
          ...createParams.data,
        },
      };
    },
    beforeUpdate: async (params) => {
      return await processCompanyLogo(params);
    },
    afterRead: (company: Record<string, any>) =>
      signRecordFiles(company, ["logo"], getSigner()),
  },
  {
    resource: "contacts_summary",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["first_name", "last_name"])(params);
    },
  },
  {
    resource: "deals",
    beforeGetList: async (params, dataProvider) => {
      return searchDealCategories(
        applyFullTextSearch(["name", "description"])(params),
        params.filter?.q,
        dataProvider,
      );
    },
  },
];

export const getDataProvider = () => {
  if (import.meta.env.VITE_SUPABASE_URL === undefined) {
    throw new Error("Please set the VITE_SUPABASE_URL environment variable");
  }
  if (import.meta.env.VITE_SB_PUBLISHABLE_KEY === undefined) {
    throw new Error(
      "Please set the VITE_SB_PUBLISHABLE_KEY environment variable",
    );
  }
  return withLifecycleCallbacks(
    getDataProviderWithCustomMethods(),
    lifeCycleCallbacks,
  ) as CrmDataProvider;
};

const applyFullTextSearch = (columns: string[]) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce((acc, column) => {
        if (column === "email")
          return {
            ...acc,
            [`email_fts@ilike`]: q,
          };
        if (column === "phone")
          return {
            ...acc,
            [`phone_fts@ilike`]: q,
          };
        else
          return {
            ...acc,
            [`${column}@ilike`]: q,
          };
      }, {}),
    },
  };
};

// Every file lives under a folder naming its owner (deals/<id>, contacts/<id>,
// companies, sales, config): the storage policy decides who may sign it.
const uploadToBucket = async (fi: RAFile, folder: string) => {
  if (!fi.src.startsWith("blob:") && !fi.src.startsWith("data:")) {
    // Sign URL check if path exists in the bucket
    if (fi.path) {
      const { error } = await getSupabaseClient()
        .storage.from(ATTACHMENTS_BUCKET)
        .createSignedUrl(fi.path, 60);

      if (!error) {
        // The record may carry the signed URL it was read with: store the
        // stable public reference, never a token.
        const { data } = getSupabaseClient()
          .storage.from(ATTACHMENTS_BUCKET)
          .getPublicUrl(fi.path);
        return { ...fi, src: data.publicUrl };
      }
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src)
        .then((res) => {
          if (res.status !== 200) {
            return null;
          }
          return res.blob();
        })
        .catch(() => null)
    : fi.rawFile;

  if (dataContent == null) {
    // We weren't able to download the file from its src (e.g. user must be signed in on another website to access it)
    // or the file has no content (not probable)
    // In that case, just return it as is: when trying to download it, users should be redirected to the other website
    // and see they need to be signed in. It will then be their responsibility to upload the file back to the note.
    return fi;
  }

  const file = fi.rawFile;
  const fileParts = file.name.split(".");
  const fileExt = fileParts.length > 1 ? `.${file.name.split(".").pop()}` : "";
  const fileName = `${Math.random()}${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  const { error: uploadError } = await getSupabaseClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .upload(filePath, dataContent);

  if (uploadError) {
    console.error("uploadError", uploadError);
    throw new Error("Failed to upload attachment");
  }

  // The bucket is private: this URL is the stable reference stored in the
  // database, and every read swaps it for a signed one (signedUrls.ts).
  const { data } = getSupabaseClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .getPublicUrl(filePath);

  fi.path = filePath;
  fi.src = data.publicUrl;

  // save MIME type
  const mimeType = file.type;
  fi.type = mimeType;

  return fi;
};
