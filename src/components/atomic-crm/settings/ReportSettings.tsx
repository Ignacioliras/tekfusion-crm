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

export const MAX_DATA_RETENTION_MONTHS = 120;

/** Whole months, 0 (off) to 120. Text input so "2,5" reaches the validator. */
export const validateDataRetention = (text: string | undefined) => {
  const value = String(text ?? "").trim();
  if (!/^-?\d+$/.test(value)) return `${MESSAGES}.retention_integer`;
  const months = Number(value);
  if (months < 0) return `${MESSAGES}.retention_negative`;
  if (months > MAX_DATA_RETENTION_MONTHS) return `${MESSAGES}.retention_max`;
  return undefined;
};

type ReportConfig = Pick<
  ConfigurationContextValue,
  "billingEmail" | "weeklyReport" | "dataRetentionMonths"
>;

export type ReportFormValues = {
  billingEmail: string;
  weeklyReport: Omit<WeeklyReport, "recipients"> & { recipients: string };
  dataRetentionMonths: string;
};

export const reportToForm = (config: ReportConfig): ReportFormValues => ({
  billingEmail: config.billingEmail,
  weeklyReport: {
    ...config.weeklyReport,
    recipients: config.weeklyReport.recipients.join(", "),
  },
  dataRetentionMonths: String(config.dataRetentionMonths),
});

export const reportFromForm = (data: ReportFormValues): ReportConfig => ({
  billingEmail: (data.billingEmail ?? "").trim(),
  weeklyReport: {
    day: data.weeklyReport.day,
    time: data.weeklyReport.time,
    recipients: parseEmailList(data.weeklyReport.recipients),
  },
  dataRetentionMonths: Number(String(data.dataRetentionMonths).trim()),
});

/**
 * Billing address, weekly report schedule (RF-14) and data retention (RF-17).
 * Management only.
 */
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Separator />
        <TextInput
          source="dataRetentionMonths"
          inputMode="numeric"
          label="tekfusion.settings.report.data_retention"
          helperText="tekfusion.settings.report.data_retention_help"
          validate={validateDataRetention}
        />
      </CardContent>
    </Card>
  );
};
