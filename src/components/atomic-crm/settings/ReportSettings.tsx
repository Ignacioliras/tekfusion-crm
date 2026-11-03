/* eslint-disable react-refresh/only-export-components */
import { email, required, useCanAccess, useTranslate } from "ra-core";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type {
  ConfigurationContextValue,
  WeeklyReport,
} from "../root/ConfigurationContext";
import { WEEKDAYS } from "./FollowupSettings";

const MESSAGES = "tekfusion.settings.validation";

const validateEmail = email(`${MESSAGES}.email_invalid`);

const WEEKDAY_CHOICES = WEEKDAYS.map((day) => ({
  id: day,
  name: `tekfusion.settings.days.${day}`,
}));

/** "a@x.cl, b@x.cl" → ["a@x.cl", "b@x.cl"]. */
export const parseEmailList = (text: string | undefined): string[] =>
  (text ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** An empty list is allowed (no report yet); every listed address must be valid. */
export const validateRecipients = (text: string | undefined) => {
  const invalid = parseEmailList(text).find((item) => validateEmail(item, {}));
  return invalid
    ? { message: `${MESSAGES}.recipients_invalid`, args: { email: invalid } }
    : undefined;
};

const validateTime = (time: string | undefined) =>
  time ? undefined : `${MESSAGES}.time_required`;

export type ReportFormValues = {
  billingEmail: string;
  weeklyReport: Omit<WeeklyReport, "recipients"> & { recipients: string };
};

export const reportToForm = (
  config: Pick<ConfigurationContextValue, "billingEmail" | "weeklyReport">,
): ReportFormValues => ({
  billingEmail: config.billingEmail,
  weeklyReport: {
    ...config.weeklyReport,
    recipients: config.weeklyReport.recipients.join(", "),
  },
});

export const reportFromForm = (
  data: ReportFormValues,
): Pick<ConfigurationContextValue, "billingEmail" | "weeklyReport"> => ({
  billingEmail: (data.billingEmail ?? "").trim(),
  weeklyReport: {
    day: data.weeklyReport.day,
    time: data.weeklyReport.time,
    recipients: parseEmailList(data.weeklyReport.recipients),
  },
});

/** Billing address and weekly report schedule (RF-14). Management only. */
export const ReportSettings = () => {
  const translate = useTranslate();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  if (!canAccess) return null;

  return (
    <Card id="report">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate("tekfusion.settings.report.title")}
        </h2>
        <TextInput
          source="billingEmail"
          // No type="email": the browser's own check would block the submit
          // before our Spanish message shows (ra-core Form doesn't set noValidate).
          inputMode="email"
          label="tekfusion.settings.report.billing_email"
          helperText={false}
          validate={validateEmail}
        />
        <Separator />
        <div className="flex gap-4">
          <SelectInput
            source="weeklyReport.day"
            label="tekfusion.settings.report.weekly_day"
            choices={WEEKDAY_CHOICES}
            helperText={false}
            validate={required()}
          />
          <TextInput
            source="weeklyReport.time"
            type="time"
            label="tekfusion.settings.report.weekly_time"
            helperText={false}
            validate={validateTime}
          />
        </div>
        <TextInput
          source="weeklyReport.recipients"
          label="tekfusion.settings.report.weekly_recipients"
          helperText="tekfusion.settings.report.weekly_recipients_help"
          validate={validateRecipients}
        />
      </CardContent>
    </Card>
  );
};
