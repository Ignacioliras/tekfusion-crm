import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreateBase,
  Form,
  required,
  useCanAccess,
  useCreateSuggestionContext,
  useDataProvider,
  useGetIdentity,
  useListContext,
  useRedirect,
  useTranslate,
  type GetListResult,
  type Identifier,
  type RaRecord,
} from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { NumberInput } from "@/components/admin/number-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput";
import { FormToolbar } from "../layout/FormToolbar";
import { contactOptionText } from "../misc/ContactOption";
import { CreateSheet } from "../misc/CreateSheet";
import { AccountManagerInput } from "../sales/AccountManagerInput";
import { CANALES_ORIGEN, labelOf } from "../tekfusion/canales";
import { detectarLineaPorPalabras, LINEAS_NEGOCIO } from "../tekfusion/lineas";
import type { Etapa } from "../tekfusion/estados";
import { normalizeEmail, normalizePhone } from "../tekfusion/phone";
import type { Deal, OriginChannel } from "../types";

const MANUAL: OriginChannel = "manual";
const NEW_STAGE: Etapa = "nuevo";
const LINE_CHOICES = LINEAS_NEGOCIO.map(({ value, label }) => ({
  value,
  label,
}));
const t = (key: string) => `tekfusion.lead.create.${key}`;

/** "Nuevo lead" (RF ingreso manual): a lead typed in from a call, a fair or a referral. */
export const DealCreate = ({ open }: { open: boolean }) => {
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { data: allDeals } = useListContext<Deal>();
  // Managers pick the owner (or none); the database makes an executive the owner.
  const { canAccess: canChooseOwner = false } = useCanAccess({
    resource: "sales",
    action: "list",
  });

  const onSuccess = async (deal: Deal) => {
    // Atomic's kanban order: the new lead goes on top of its column. An
    // executive also sees unassigned leads but RLS won't let them update those.
    const deals = (allDeals ?? []).filter(
      (d) =>
        d.stage === deal.stage &&
        d.id !== deal.id &&
        (canChooseOwner || d.sales_id === identity?.id),
    );
    await Promise.all(
      deals.map((oldDeal) =>
        dataProvider.update("deals", {
          id: oldDeal.id,
          data: { index: oldDeal.index + 1 },
          previousData: oldDeal,
        }),
      ),
    );
    const shifted = new Map(deals.map((d) => [d.id, d.index + 1]));
    queryClient.setQueriesData<GetListResult | undefined>(
      { queryKey: ["deals", "getList"] },
      (res) =>
        res && {
          ...res,
          data: res.data.map((d: Deal) =>
            shifted.has(d.id) ? { ...d, index: shifted.get(d.id) } : d,
          ),
        },
      { updatedAt: Date.now() },
    );
    redirect(`/deals/${deal.id}/show`);
  };

  const transform = (data: Partial<Deal>) => ({
    ...data,
    origin_channel: MANUAL,
    stage: NEW_STAGE,
    index: 0,
    // "" or missing = unassigned; id 0 is a real owner in FakeRest.
    sales_id: canChooseOwner
      ? data.sales_id === "" || data.sales_id == null
        ? null
        : data.sales_id
      : identity?.id,
  });

  return (
    <Dialog open={open} onOpenChange={() => redirect("/deals")}>
      <DialogContent className="lg:max-w-2xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        <DialogTitle className="text-xl font-semibold">
          {translate(t("title"))}
        </DialogTitle>
        <CreateBase
          resource="deals"
          transform={transform}
          mutationOptions={{ onSuccess }}
        >
          <Form defaultValues={{ contact_ids: [], amount: null }}>
            <LeadCreateInputs canChooseOwner={canChooseOwner} />
            <FormToolbar />
          </Form>
        </CreateBase>
      </DialogContent>
    </Dialog>
  );
};

const validateAmount = (value: unknown) =>
  value == null ||
  value === "" ||
  (Number.isInteger(value) && Number(value) >= 0)
    ? undefined
    : t("amount_invalid");

const LeadCreateInputs = ({ canChooseOwner }: { canChooseOwner: boolean }) => {
  const translate = useTranslate();
  const companyId = useWatch({ name: "company_id" });
  return (
    <div className="flex flex-col gap-4 p-1">
      <TextInput
        source="name"
        label={t("name")}
        validate={required()}
        helperText={false}
      />
      <ReferenceInput source="company_id" reference="companies">
        <AutocompleteCompanyInput
          label={t("company_id")}
          validate={required()}
          modal
        />
      </ReferenceInput>
      <ReferenceArrayInput
        source="contact_ids"
        reference="contacts_summary"
        filter={companyId ? { company_id: companyId } : {}}
      >
        <AutocompleteArrayInput
          label={t("contact_ids")}
          optionText={contactOptionText}
          helperText={false}
          create={<CreateLeadContact />}
          createItemLabel="resources.contacts.autocomplete.create_item"
          createLabel="resources.contacts.autocomplete.create_label"
        />
      </ReferenceArrayInput>
      <BusinessLineInput />
      <NumberInput
        source="amount"
        label={t("amount")}
        step={1}
        min={0}
        validate={validateAmount}
        helperText={false}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          {translate(t("origin_channel"))}
        </span>
        <span className="text-sm text-muted-foreground">
          {labelOf(CANALES_ORIGEN, MANUAL)}
        </span>
      </div>
      {canChooseOwner ? (
        <AccountManagerInput
          label={t("sales_id")}
          placeholder="tekfusion.common.unassigned"
        />
      ) : null}
    </div>
  );
};

/** Suggests the line from the product until the user picks one by hand. */
const BusinessLineInput = () => {
  const name = useWatch({ name: "name" });
  const { setValue } = useFormContext();
  const isPickedByHand = useRef(false);

  useEffect(() => {
    if (!isPickedByHand.current) {
      setValue("business_line", detectarLineaPorPalabras(name ?? ""));
    }
  }, [name, setValue]);

  return (
    <SelectInput
      source="business_line"
      label={t("business_line")}
      choices={LINE_CHOICES}
      optionText="label"
      optionValue="value"
      validate={required()}
      helperText={t("business_line_help")}
      onChange={() => {
        isPickedByHand.current = true;
      }}
    />
  );
};

const validateEmail = (value?: string) =>
  value && !normalizeEmail(value) ? t("email_invalid") : undefined;
const validatePhone = (value?: string) =>
  value && !normalizePhone(value) ? t("phone_invalid") : undefined;

type LeadContactForm = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: Identifier;
};

const splitFullName = (fullName: string | undefined) => {
  const [first_name = "", ...rest] = (fullName ?? "").trim().split(/\s+/);
  return { first_name, last_name: rest.join(" ") };
};

/** "Crear «X»" on the contact: name, surname, e-mail and phone, nothing else. */
const CreateLeadContact = () => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const queryClient = useQueryClient();
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const company_id = useWatch({ name: "company_id" });

  const transform = ({ email, phone, ...data }: LeadContactForm) => {
    const now = new Date().toISOString();
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);
    return {
      ...data,
      sales_id: identity?.id,
      email_jsonb: cleanEmail ? [{ email: cleanEmail, type: "Work" }] : null,
      phone_jsonb: cleanPhone ? [{ number: cleanPhone, type: "Work" }] : null,
      first_seen: now,
      last_seen: now,
      tags: [],
    };
  };

  return (
    <CreateSheet
      resource="contacts"
      title={translate(t("contact_title"))}
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      defaultValues={{ ...splitFullName(filter), company_id }}
      transform={transform}
      redirect={false}
      mutationOptions={{
        onSuccess: (contact: RaRecord) => {
          queryClient.invalidateQueries({ queryKey: ["contacts_summary"] });
          onCreate(contact);
        },
      }}
    >
      <TextInput
        source="first_name"
        label={t("first_name")}
        validate={required()}
        helperText={false}
      />
      <TextInput
        source="last_name"
        label={t("last_name")}
        validate={required()}
        helperText={false}
      />
      <TextInput
        source="email"
        label={t("email")}
        inputMode="email"
        validate={validateEmail}
        helperText={false}
      />
      <TextInput
        source="phone"
        label={t("phone")}
        inputMode="tel"
        validate={validatePhone}
        helperText={false}
      />
    </CreateSheet>
  );
};
