import {
  Form,
  useCreate,
  useNotify,
  useRefresh,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useWatch, type FieldValues } from "react-hook-form";

import { BooleanInput } from "@/components/admin/boolean-input";
import { DateTimeInput } from "@/components/admin/date-time-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { defaultBusinessHours } from "../root/defaultConfiguration";
import { nextBusinessDayAt } from "../tekfusion/santiago";
import type { Deal, Followup, FollowupMessages, SendChannel } from "../types";
import { ChannelMessage } from "./ChannelMessage";

const CHANNELS: SendChannel[] = ["correo", "whatsapp"];
// docs/03: a follow-up written by hand goes out at 10:00 of a business day.
const DEFAULT_TIME = "10:00";

interface FollowupFormValues {
  scheduled_at?: string;
  send_correo?: boolean;
  send_whatsapp?: boolean;
  mode?: Followup["mode"];
  correo_template_id?: Followup["template_id"];
  correo_subject?: string;
  correo_body?: string;
  whatsapp_template_id?: Followup["template_id"];
  whatsapp_body?: string;
}

const channelsOf = (values: FollowupFormValues): SendChannel[] =>
  CHANNELS.filter((channel) => values[`send_${channel}`]);

// Form-level: a field validator inside a ReferenceInput can register late.
const validateFollowup = (values: FieldValues) => {
  const v = values as FollowupFormValues;
  const errors: Record<string, string> = {};
  if (!v.scheduled_at || new Date(v.scheduled_at) <= new Date()) {
    errors.scheduled_at = "tekfusion.followup.past_date";
  }
  const channels = channelsOf(v);
  if (channels.length === 0) {
    errors.send_whatsapp = "tekfusion.followup.channels_required";
  }
  // The system sends an automatic one as is: it needs its text. A reminder
  // only tells the executive, who writes it then.
  if (v.mode === "automatico") {
    for (const channel of channels) {
      if (!v[`${channel}_body`]?.trim()) {
        errors[`${channel}_body`] = "tekfusion.followup.message_required";
      }
    }
    if (channels.includes("correo") && !v.correo_subject?.trim()) {
      errors.correo_subject = "tekfusion.followup.subject_required";
    }
  }
  return errors;
};

const messagesOf = (v: FollowupFormValues): FollowupMessages =>
  Object.fromEntries(
    channelsOf(v).map((channel) => [
      channel,
      {
        template_id: v[`${channel}_template_id`] || null,
        ...(channel === "correo" ? { subject: v.correo_subject ?? "" } : {}),
        body: v[`${channel}_body`] ?? "",
      },
    ]),
  );

/** Form values of a saved follow-up; one from the cadence only has template_id. */
const valuesOf = (followup: Followup): FollowupFormValues => {
  const messages = followup.messages ?? {};
  const legacyTemplate = (channel: SendChannel) =>
    followup.channels[0] === channel ? followup.template_id : null;
  return {
    scheduled_at: followup.scheduled_at,
    send_correo: followup.channels.includes("correo"),
    send_whatsapp: followup.channels.includes("whatsapp"),
    mode: followup.mode,
    correo_template_id:
      messages.correo?.template_id ?? legacyTemplate("correo"),
    correo_subject: messages.correo?.subject ?? "",
    correo_body: messages.correo?.body ?? "",
    whatsapp_template_id:
      messages.whatsapp?.template_id ?? legacyTemplate("whatsapp"),
    whatsapp_body: messages.whatsapp?.body ?? "",
  };
};

/**
 * Schedule a follow-up or adjust one (RF-07): date, channels, automatic or
 * reminder, and per channel its template and the text to send.
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
  const { businessHours } = useConfigurationContext();
  const [create, { isPending: isCreating }] = useCreate();
  const [update, { isPending: isUpdating }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const title = followup
    ? "tekfusion.followup.adjust_title"
    : "tekfusion.followup.schedule_title";

  const defaultValues: FollowupFormValues = followup
    ? valuesOf(followup)
    : {
        scheduled_at: nextBusinessDayAt(
          new Date(),
          (businessHours ?? defaultBusinessHours).days,
          DEFAULT_TIME,
        ).toISOString(),
        send_correo: true,
        send_whatsapp: false,
        mode: "automatico",
      };

  const handleSubmit = (values: FieldValues) => {
    const v = values as FollowupFormValues;
    const messages = messagesOf(v);
    const data = {
      scheduled_at: new Date(v.scheduled_at as string).toISOString(),
      channels: channelsOf(v),
      mode: v.mode,
      // Kept for the cadence and n8n: the first channel's template.
      template_id: Object.values(messages)[0]?.template_id ?? null,
      messages,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{translate(title)}</DialogTitle>
          <DialogDescription>
            {deal.name}
            {followup
              ? ` · ${translate("tekfusion.followup.step", { step: followup.step })}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <Form
          defaultValues={defaultValues}
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
              <legend className="mb-2 text-sm font-medium">
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
            <ChannelMessages deal={deal} />
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

/** One block per channel switched on. */
const ChannelMessages = ({ deal }: { deal: Deal }) => {
  const sendCorreo = useWatch({ name: "send_correo" });
  const sendWhatsapp = useWatch({ name: "send_whatsapp" });
  return (
    <>
      {sendCorreo ? <ChannelMessage channel="correo" deal={deal} /> : null}
      {sendWhatsapp ? <ChannelMessage channel="whatsapp" deal={deal} /> : null}
    </>
  );
};
