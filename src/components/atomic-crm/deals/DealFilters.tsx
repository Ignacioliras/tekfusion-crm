import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";

import type { DealStage } from "../types";
import { CANALES_ORIGEN } from "../tekfusion/canales";
import { LINEAS_NEGOCIO } from "../tekfusion/lineas";

// ponytail: day bounds in UTC; shift to America/Santiago if leads near midnight get misfiled.
const endOfDay = (value: string) => (value ? `${value}T23:59:59.999Z` : value);
const startOfDay = (value: string) =>
  value ? `${value}T00:00:00.000Z` : value;
const dayOf = (value?: string) => value?.slice(0, 10) ?? "";

/** TekFusion lead filters shared by the board and the table (RF-04). */
export const leadFilters = () => [
  <SelectInput
    key="business_line"
    source="business_line"
    label="tekfusion.lead.filters.business_line"
    choices={[...LINEAS_NEGOCIO]}
    optionValue="value"
    optionText="label"
    translateChoice={false}
    alwaysOn
  />,
  <SelectInput
    key="origin_channel"
    source="origin_channel"
    label="tekfusion.lead.filters.origin_channel"
    choices={[...CANALES_ORIGEN]}
    optionValue="value"
    optionText="label"
    translateChoice={false}
    alwaysOn
  />,
  <DateInput
    key="created_at@gte"
    source="created_at@gte"
    label="tekfusion.lead.filters.created_from"
    parse={startOfDay}
    format={dayOf}
    alwaysOn
  />,
  <DateInput
    key="created_at@lte"
    source="created_at@lte"
    label="tekfusion.lead.filters.created_to"
    parse={endOfDay}
    format={dayOf}
    alwaysOn
  />,
];

/** Stage filter: only for the table, the board's columns already are stages. */
export const stageFilter = (dealStages: DealStage[]) => (
  <SelectInput
    key="stage"
    source="stage"
    label="tekfusion.lead.filters.stage"
    choices={dealStages}
    optionValue="value"
    optionText="label"
    translateChoice={false}
    alwaysOn
  />
);
