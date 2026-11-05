import { useGetOne, useTranslate } from "ra-core";
import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

import type {
  Company,
  Contact,
  Deal,
  Sale,
  SendChannel,
  Template,
} from "../types";
import { renderTemplate, type TemplateVariables } from "./renderTemplate";

/** Values a template fills: first contact, company, product (lead name), executive. */
const useTemplateVariables = (
  deal: Deal,
): { variables: TemplateVariables; isLoaded: boolean } => {
  const contactId = deal.contact_ids?.[0];
  const contact = useGetOne<Contact>(
    "contacts",
    { id: contactId },
    { enabled: contactId != null },
  );
  const company = useGetOne<Company>(
    "companies",
    { id: deal.company_id },
    { enabled: deal.company_id != null },
  );
  const sale = useGetOne<Sale>(
    "sales",
    { id: deal.sales_id },
    { enabled: deal.sales_id != null },
  );
  const seller = sale.data;
  return {
    variables: {
      nombre: contact.data?.first_name,
      empresa: company.data?.name,
      producto: deal.name,
      ejecutivo:
        seller?.signature ||
        (seller ? `${seller.first_name} ${seller.last_name}` : null),
    },
    isLoaded: !contact.isLoading && !company.isLoading && !sale.isLoading,
  };
};

/**
 * One channel of a follow-up: its template (only that channel's) and the text
 * that will be sent. Picking a template fills the text with the variables
 * resolved; the executive can then retouch it or write from scratch. Plain
 * text only.
 */
export const ChannelMessage = ({
  channel,
  deal,
}: {
  channel: SendChannel;
  deal: Deal;
}) => {
  const translate = useTranslate();
  const { getValues, setValue } = useFormContext();
  const templateId = useWatch({ name: `${channel}_template_id` });
  const { variables, isLoaded } = useTemplateVariables(deal);
  const { data: template } = useGetOne<Template>(
    "templates",
    { id: templateId },
    { enabled: !!templateId },
  );
  // Template last copied into the text; null until the dialog fills it once.
  const filledFrom = useRef<string | null>(null);

  useEffect(() => {
    if (!template || String(template.id) !== String(templateId) || !isLoaded)
      return;
    const isOpening = filledFrom.current === null;
    if (filledFrom.current === String(template.id)) return;
    filledFrom.current = String(template.id);
    // On opening, a text already written (saved follow-up) wins over the template.
    if (isOpening && getValues(`${channel}_body`)) return;
    const options = { shouldDirty: true };
    setValue(
      `${channel}_body`,
      renderTemplate(template.body, variables),
      options,
    );
    if (channel === "correo") {
      setValue(
        "correo_subject",
        renderTemplate(template.subject, variables),
        options,
      );
    }
  }, [template, templateId, isLoaded, variables, channel, getValues, setValue]);

  return (
    <section
      aria-label={translate(`tekfusion.followup.message_${channel}`)}
      className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3"
    >
      <h3 className="text-sm font-medium">
        {translate(`tekfusion.followup.message_${channel}`)}
      </h3>
      <ReferenceInput
        source={`${channel}_template_id`}
        reference="templates"
        filter={{ active: true, channel }}
        sort={{ field: "name", order: "ASC" }}
      >
        <SelectInput
          label="tekfusion.followup.template"
          optionText="name"
          emptyText="tekfusion.followup.no_template"
          helperText={false}
        />
      </ReferenceInput>
      {channel === "correo" ? (
        <TextInput
          source="correo_subject"
          label="tekfusion.followup.preview_subject"
          helperText={false}
        />
      ) : null}
      <TextInput
        source={`${channel}_body`}
        label="tekfusion.followup.message"
        multiline
        rows={5}
        helperText="tekfusion.followup.message_help"
      />
    </section>
  );
};
