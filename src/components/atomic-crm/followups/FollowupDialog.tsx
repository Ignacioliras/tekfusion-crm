import {
  Form,
  useCreate,
  useGetOne,
  useNotify,
  useRefresh,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useWatch, type FieldValues } from "react-hook-form";

import { BooleanInput } from "@/components/admin/boolean-input";
import { DateTimeInput } from "@/components/admin/date-time-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  Company,
  Contact,
  Deal,
  Followup,
  Sale,
  SendChannel,
  Template,
} from "../types";
import { renderTemplate, type TemplateVariables } from "./renderTemplate";

interface FollowupFormValues {
  scheduled_at?: string;
  send_correo?: boolean;
  send_whatsapp?: boolean;
  mode?: Followup["mode"];
  template_id?: Followup["template_id"];
}

// Form-level: a field validator inside a ReferenceInput can register late.
const validateFollowup = (values: FieldValues) => {
  const errors: Record<string, string> = {};
  if (!values.scheduled_at || new Date(values.scheduled_at) <= new Date()) {
    errors.scheduled_at = "tekfusion.followup.past_date";
  }
  if (!values.send_correo && !values.send_whatsapp) {
    errors.send_whatsapp = "tekfusion.followup.channels_required";
  }
  return errors;
};

const channelsOf = (values: FollowupFormValues): SendChannel[] => [
  ...(values.send_correo ? (["correo"] as const) : []),
  ...(values.send_whatsapp ? (["whatsapp"] as const) : []),
];

/** Values the preview fills: first contact, company, product (lead name), executive. */
const useTemplateVariables = (deal: Deal): TemplateVariables => {
  const contactId = deal.contact_ids?.[0];
  const { data: contact } = useGetOne<Contact>(
    "contacts",
    { id: contactId },
    { enabled: contactId != null },
  );
  const { data: company } = useGetOne<Company>(
    "companies",
    { id: deal.company_id },
    { enabled: deal.company_id != null },
  );
  const { data: sale } = useGetOne<Sale>(
    "sales",
    { id: deal.sales_id },
    { enabled: deal.sales_id != null },
  );
  return {
    nombre: contact?.first_name,
    empresa: company?.name,
    producto: deal.name,
    ejecutivo:
      sale?.signature || (sale ? `${sale.first_name} ${sale.last_name}` : null),
  };
};

/**
 * Schedule a follow-up or adjust one (RF-07): date, channels, automatic or
 * reminder, template, and a preview with the variables resolved.
 */
export const FollowupDialog = ({
  deal,
  followup,
  nextStep,
  open,
  onClose,
}: {
  deal: Deal;
  followup?: Followup;
  nextStep?: number;
  open: boolean;
  onClose: () => void;
}) => {
  const translate = useTranslate();
  const [create, { isPending: isCreating }] = useCreate();
  const [update, { isPending: isUpdating }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const title = followup
    ? "tekfusion.followup.adjust_title"
    : "tekfusion.followup.schedule_title";

  const handleSubmit = (values: FieldValues) => {
    const v = values as FollowupFormValues;
    const data = {
      scheduled_at: new Date(v.scheduled_at as string).toISOString(),
      channels: channelsOf(v),
      mode: v.mode,
      template_id: v.template_id || null,
    };
    const options = {
      onSuccess: () => {
        notify("tekfusion.followup.saved", { type: "info" });
        refresh();
        onClose();
      },
      onError: () => notify("tekfusion.common.save_error", { type: "error" }),
    };
    if (followup) {
      // Adjusting an overdue reminder puts it back in the queue.
      update(
        "followups",
        {
          id: followup.id,
          data: { ...data, status: "pendiente" },
          previousData: followup,
        },
        options,
      );
    } else {
      create(
        "followups",
        {
          data: {
            ...data,
            deal_id: deal.id,
            step: nextStep ?? 1,
            status: "pendiente",
            attempts: 0,
            created_at: new Date().toISOString(),
          },
        },
        options,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{translate(title)}</DialogTitle>
          <DialogDescription>
            {deal.name} ·{" "}
            {translate("tekfusion.followup.step", {
              step: followup?.step ?? nextStep ?? 1,
            })}
          </DialogDescription>
        </DialogHeader>
        <Form
          defaultValues={{
            scheduled_at: followup?.scheduled_at,
            send_correo: followup ? followup.channels.includes("correo") : true,
            send_whatsapp: followup?.channels.includes("whatsapp") ?? false,
            mode: followup?.mode ?? "automatico",
            template_id: followup?.template_id ?? null,
          }}
          validate={validateFollowup}
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-4">
            <DateTimeInput
              source="scheduled_at"
              label="tekfusion.followup.scheduled_at"
              helperText={false}
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium mb-2">
                {translate("tekfusion.followup.channels")}
              </legend>
              <BooleanInput
                source="send_correo"
                label="Correo"
                helperText={false}
              />
              <BooleanInput
                source="send_whatsapp"
                label="WhatsApp"
                helperText={false}
              />
            </fieldset>
            <RadioButtonGroupInput
              source="mode"
              label="tekfusion.followup.mode"
              choices={[
                {
                  id: "automatico",
                  name: "tekfusion.followup.modes.automatico",
                },
                {
                  id: "recordatorio",
                  name: "tekfusion.followup.modes.recordatorio",
                },
              ]}
              helperText={false}
            />
            <ReferenceInput
              source="template_id"
              reference="templates"
              filter={{ active: true }}
              sort={{ field: "name", order: "ASC" }}
            >
              <SelectInput
                label="tekfusion.followup.template"
                optionText="name"
                emptyText="tekfusion.followup.no_template"
              />
            </ReferenceInput>
            <TemplatePreview deal={deal} />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              {translate("tekfusion.common.cancel")}
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {translate("tekfusion.common.save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const TemplatePreview = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const templateId = useWatch({ name: "template_id" });
  const variables = useTemplateVariables(deal);
  const { data: template } = useGetOne<Template>(
    "templates",
    { id: templateId },
    { enabled: !!templateId },
  );
  if (!templateId || !template) return null;

  return (
    <section
      aria-label={translate("tekfusion.followup.preview")}
      className="rounded-md border bg-muted/40 p-3 text-sm flex flex-col gap-1"
    >
      <span className="text-xs text-muted-foreground">
        {translate("tekfusion.followup.preview")}
      </span>
      {template.subject ? (
        <p>
          <span className="text-muted-foreground">
            {translate("tekfusion.followup.preview_subject")}:{" "}
          </span>
          {renderTemplate(template.subject, variables)}
        </p>
      ) : null}
      <p className="whitespace-pre-line">
        {renderTemplate(template.body, variables)}
      </p>
    </section>
  );
};
