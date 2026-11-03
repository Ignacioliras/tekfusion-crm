import { required, useCanAccess, useTranslate } from "ra-core";
import { ReferenceArrayField } from "@/components/admin/reference-array-field";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextField } from "@/components/admin/text-field";
import { Badge } from "@/components/ui/badge";

import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput";
import { AutocompleteContactInput } from "../contacts/AutocompleteContactInput";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { CANALES_ORIGEN, labelOf } from "../tekfusion/canales";
import { LINEAS_NEGOCIO } from "../tekfusion/lineas";
import { formatAmount } from "../tekfusion/money";
import type { Deal } from "../types";
import { ContactList } from "./ContactList";
import { findDealLabel } from "./dealUtils";
import { InlineEditField } from "./InlineEditField";

const LINE_CHOICES = LINEAS_NEGOCIO.map(({ value, label }) => ({
  value,
  label,
}));

/** "Datos del lead" (RF-05): the editable fields of the file, one at a time. */
export const LeadDataBlock = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const { dealStages, currency } = useConfigurationContext();
  const { canAccess: canEdit = false } = useCanAccess({
    resource: "deals",
    action: "edit",
    record: deal,
  });
  const t = (field: string) => translate(`tekfusion.lead.data.${field}`);

  return (
    <section aria-label={t("title")} className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">{t("title")}</h3>

      <ReadOnlyField label={t("stage")}>
        <Badge variant="outline">{findDealLabel(dealStages, deal.stage)}</Badge>
      </ReadOnlyField>

      <InlineEditField
        label={t("business_line")}
        source="business_line"
        canEdit={canEdit}
        input={
          <SelectInput
            source="business_line"
            label={t("business_line")}
            choices={LINE_CHOICES}
            optionText="label"
            optionValue="value"
            validate={required()}
            helperText={false}
          />
        }
      >
        {labelOf(LINE_CHOICES, deal.business_line)}
      </InlineEditField>

      <InlineEditField
        label={t("origin_channel")}
        source="origin_channel"
        canEdit={canEdit}
        input={
          <SelectInput
            source="origin_channel"
            label={t("origin_channel")}
            choices={[...CANALES_ORIGEN]}
            optionText="label"
            optionValue="value"
            validate={required()}
            helperText={false}
          />
        }
      >
        {labelOf(CANALES_ORIGEN, deal.origin_channel)}
      </InlineEditField>

      <ReadOnlyField label={t("sales_id")}>
        {deal.sales_id != null ? (
          <ReferenceField source="sales_id" reference="sales" link={false}>
            <SaleFullName />
          </ReferenceField>
        ) : (
          <span className="text-muted-foreground">
            {translate("tekfusion.common.unassigned")}
          </span>
        )}
      </ReadOnlyField>

      <InlineEditField
        label={t("contact_ids")}
        source="contact_ids"
        canEdit={canEdit}
        input={
          <ReferenceArrayInput
            source="contact_ids"
            reference="contacts_summary"
          >
            <AutocompleteContactInput label={t("contact_ids")} />
          </ReferenceArrayInput>
        }
      >
        {deal.contact_ids?.length ? (
          <ReferenceArrayField
            source="contact_ids"
            reference="contacts_summary"
          >
            <ContactList />
          </ReferenceArrayField>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </InlineEditField>

      <InlineEditField
        label={t("company_id")}
        source="company_id"
        canEdit={canEdit}
        input={
          <ReferenceInput source="company_id" reference="companies">
            <AutocompleteCompanyInput
              label={t("company_id")}
              validate={required()}
              modal
            />
          </ReferenceInput>
        }
      >
        <ReferenceField source="company_id" reference="companies" link="show">
          <TextField source="name" />
        </ReferenceField>
      </InlineEditField>

      <ReadOnlyField label={t("amount")}>
        {formatAmount(deal.amount, currency)}
      </ReadOnlyField>
      {deal.won_amount != null ? (
        <ReadOnlyField label={t("won_amount")}>
          {formatAmount(deal.won_amount, currency)}
        </ReadOnlyField>
      ) : null}
      {deal.lost_reason_id != null ? (
        <ReadOnlyField label={t("lost_reason")}>
          <ReferenceField
            source="lost_reason_id"
            reference="lost_reasons"
            link={false}
          >
            <TextField source="name" />
          </ReferenceField>
        </ReadOnlyField>
      ) : null}
    </section>
  );
};

const ReadOnlyField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-muted-foreground tracking-wide">{label}</span>
    <div className="text-sm min-h-6 flex items-center">{children}</div>
  </div>
);

const SaleFullName = () => (
  <span>
    <TextField source="first_name" /> <TextField source="last_name" />
  </span>
);
