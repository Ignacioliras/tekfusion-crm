import { useMemo } from "react";
import { useStore } from "ra-core";

import type { DealStage, LabeledValue, NoteStatus } from "../types";
import { defaultConfiguration } from "./defaultConfiguration";

export const CONFIGURATION_STORE_KEY = "app.configuration";

/** ISO weekdays: 1 = Monday … 7 = Sunday. Times are "HH:MM", America/Santiago. */
export interface BusinessHours {
  days: number[];
  from: string;
  to: string;
}

export interface WeeklyReport {
  day: number;
  time: string;
  recipients: string[];
}

export interface ConfigurationContextValue {
  /** Read by public.send_quote (default [2, 5, 10] there too). */
  followupCadenceDays: number[];
  businessHours: BusinessHours;
  billingEmail: string;
  weeklyReport: WeeklyReport;
  /** Months before lost/archived leads are anonymized (RF-17); 0 = off. */
  dataRetentionMonths: number;
  companySectors: LabeledValue[];
  currency: string;
  dealCategories: LabeledValue[];
  dealPipelineStatuses: string[];
  dealStages: DealStage[];
  noteStatuses: NoteStatus[];
  taskTypes: LabeledValue[];
  title: string;
  darkModeLogo: string;
  lightModeLogo: string;
}

export const useConfigurationContext = () => {
  const [config] = useStore<ConfigurationContextValue>(
    CONFIGURATION_STORE_KEY,
    defaultConfiguration,
  );
  // Merge with defaults so that missing fields in stored config
  // fall back to default values (e.g. when new settings are added)
  return useMemo(() => ({ ...defaultConfiguration, ...config }), [config]);
};

export const useConfigurationUpdater = () => {
  const [, setConfig] = useStore<ConfigurationContextValue>(
    CONFIGURATION_STORE_KEY,
  );
  return setConfig;
};
