/* eslint-disable react-refresh/only-export-components */
import { useCanAccess, useInput, useTranslate, type Validator } from "ra-core";
import { TextInput } from "@/components/admin/text-input";
import { FormError, FormField } from "@/components/admin/form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type {
  BusinessHours,
  ConfigurationContextValue,
} from "../root/ConfigurationContext";

export const MAX_CADENCE_STEPS = 6;
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const MESSAGES = "tekfusion.settings.validation";

/** "2, 5, 10" → [2, 5, 10]. Invalid tokens become NaN, caught by the validator. */
export const parseNumberList = (text: string | undefined): number[] =>
  (text ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (/^\d+$/.test(token) ? Number(token) : NaN));

export const validateCadence = (text: string | undefined) => {
  const days = parseNumberList(text);
  if (days.length === 0) return `${MESSAGES}.cadence_required`;
  if (days.some((day) => !Number.isInteger(day) || day < 1)) {
    return `${MESSAGES}.cadence_invalid`;
  }
  if (days.length > MAX_CADENCE_STEPS) return `${MESSAGES}.cadence_too_many`;
  if (days.some((day, i) => i > 0 && day <= days[i - 1])) {
    return `${MESSAGES}.cadence_order`;
  }
  return undefined;
};

const validateDays = (days: number[] | undefined) =>
  days?.length ? undefined : `${MESSAGES}.days_required`;

const validateTime = (time: string | undefined) =>
  time ? undefined : `${MESSAGES}.time_required`;

// "HH:MM" strings compare correctly as text.
const validateTo: Validator = (to, allValues) =>
  validateTime(to) ??
  (to <= (allValues?.businessHours?.from ?? "")
    ? `${MESSAGES}.hours_order`
    : undefined);

export type FollowupFormValues = {
  followupCadenceDays: string;
  businessHours: BusinessHours;
};

export const followupToForm = (
  config: Pick<
    ConfigurationContextValue,
    "followupCadenceDays" | "businessHours"
  >,
): FollowupFormValues => ({
  followupCadenceDays: config.followupCadenceDays.join(", "),
  businessHours: config.businessHours,
});

export const followupFromForm = (
  data: FollowupFormValues,
): Pick<
  ConfigurationContextValue,
  "followupCadenceDays" | "businessHours"
> => ({
  followupCadenceDays: parseNumberList(data.followupCadenceDays),
  businessHours: {
    days: [...data.businessHours.days].sort((a, b) => a - b),
    from: data.businessHours.from,
    to: data.businessHours.to,
  },
});

/** Default follow-up cadence and business hours (RF-14). Management only. */
export const FollowupSettings = () => {
  const translate = useTranslate();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  if (!canAccess) return null;

  return (
    <Card id="followups">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate("tekfusion.settings.followups.title")}
        </h2>
        <TextInput
          source="followupCadenceDays"
          label="tekfusion.settings.followups.cadence"
          helperText="tekfusion.settings.followups.cadence_help"
          validate={validateCadence}
        />
        <Separator />
        <WeekdaysInput
          source="businessHours.days"
          label="tekfusion.settings.followups.business_days"
        />
        <div className="flex gap-4">
          <TextInput
            source="businessHours.from"
            type="time"
            label="tekfusion.settings.followups.business_from"
            helperText={false}
            validate={validateTime}
          />
          <TextInput
            source="businessHours.to"
            type="time"
            label="tekfusion.settings.followups.business_to"
            helperText={false}
            validate={validateTo}
          />
        </div>
      </CardContent>
    </Card>
  );
};

/** ISO weekdays (1 = Monday) as native checkboxes. */
const WeekdaysInput = ({
  source,
  label,
}: {
  source: string;
  label: string;
}) => {
  const translate = useTranslate();
  const { id, field } = useInput({ source, validate: validateDays });
  const selected: number[] = field.value ?? [];

  const toggle = (day: number) =>
    field.onChange(
      selected.includes(day)
        ? selected.filter((d) => d !== day)
        : [...selected, day],
    );

  return (
    <FormField id={id} name={field.name}>
      <fieldset>
        <legend className="text-sm font-medium mb-2">{translate(label)}</legend>
        <div className="flex flex-wrap gap-4">
          {WEEKDAYS.map((day) => (
            <label key={day} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(day)}
                onChange={() => toggle(day)}
                onBlur={field.onBlur}
              />
              {translate(`tekfusion.settings.days.${day}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <FormError />
    </FormField>
  );
};
