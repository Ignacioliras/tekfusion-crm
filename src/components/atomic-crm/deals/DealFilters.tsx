import { useTranslate } from "ra-core";
import type { ReactNode } from "react";

import { DateInput } from "@/components/admin/date-input";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";
import { Label } from "@/components/ui/label";

import { AccountManagerInput } from "../sales/AccountManagerInput";
import { OnlyMineInput } from "./OnlyMineInput";

import type { DealStage } from "../types";
import { CANALES_ORIGEN } from "../tekfusion/canales";
import { LINEAS_NEGOCIO } from "../tekfusion/lineas";

// ponytail: day bounds in UTC; shift to America/Santiago if leads near midnight get misfiled.
const endOfDay = (value: string) => (value ? `${value}T23:59:59.999Z` : value);
const startOfDay = (value: string) =>
  value ? `${value}T00:00:00.000Z` : value;
const dayOf = (value?: string) => value?.slice(0, 10) ?? "";

/**
 * A filter input that has no label of its own, with one above like the
 * selects next to it, so the whole row lines up. FilterForm reads `source`
 * and `alwaysOn` from the element.
 */
const Labeled = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
  source: string;
  alwaysOn: boolean;
}) => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-2">
      <Label>{translate(label)}</Label>
      {children}
    </div>
  );
};

/** Search and executive filters, labelled; executives get "only mine". */
export const leadSearchFilters = (canAccessSalesList: boolean) => [
  <Labeled key="q" source="q" alwaysOn label="ra.action.search">
    <SearchInput source="q" />
  </Labeled>,
  canAccessSalesList ? (
    <AccountManagerInput
      key="sales_id"
      source="sales_id"
      alwaysOn
      label="crm.common.account_manager"
      placeholder="tekfusion.lead.filters.all"
    />
  ) : (
    <Labeled
      key="sales_id"
      source="sales_id"
      alwaysOn
      label="crm.common.account_manager"
    >
      <OnlyMineInput source="sales_id" alwaysOn />
    </Labeled>
  ),
];

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
    emptyText="tekfusion.lead.filters.all"
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
    emptyText="tekfusion.lead.filters.all"
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
    emptyText="tekfusion.lead.filters.all"
    alwaysOn
  />
);
