import { useCanAccess } from "ra-core";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { ReferenceField } from "@/components/admin/reference-field";
import { SearchInput } from "@/components/admin/search-input";
import { SelectField } from "@/components/admin/select-field";

import { TopToolbar } from "../layout/TopToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { AccountManagerInput } from "../sales/AccountManagerInput";
import { formatAmount } from "../tekfusion/money";
import { leadFilters, stageFilter } from "./DealFilters";
import { OnlyMineInput } from "./OnlyMineInput";

/**
 * Table view of the open (non-archived) deals, shown as "Leads" in the menu.
 * The kanban (DealList) stays the "Pipeline"; a row opens the deal sheet there.
 */
export const DealTableList = () => {
  const { dealStages, currency } = useConfigurationContext();
  const { canAccess: canAccessSalesList, isPending } = useCanAccess({
    resource: "sales",
    action: "list",
  });
  if (isPending) return null;
  const filters = [
    <SearchInput key="q" source="q" alwaysOn />,
    canAccessSalesList ? (
      <AccountManagerInput key="sales_id" source="sales_id" alwaysOn />
    ) : (
      <OnlyMineInput key="sales_id" source="sales_id" alwaysOn />
    ),
    stageFilter(dealStages),
    ...leadFilters(),
  ];
  return (
    <List
      resource="deals"
      filter={{ "archived_at@is": null }}
      filters={filters}
      sort={{ field: "created_at", order: "DESC" }}
      actions={
        <TopToolbar>
          <ExportButton />
        </TopToolbar>
      }
    >
      <DataTable
        bulkActionButtons={false}
        rowClick={(id) => `/deals/${id}/show`}
      >
        <DataTable.Col source="name" />
        <DataTable.Col source="company_id">
          <ReferenceField source="company_id" reference="companies" />
        </DataTable.Col>
        <DataTable.Col source="stage">
          <SelectField
            source="stage"
            choices={dealStages}
            optionValue="value"
            optionText="label"
            translateChoice={false}
          />
        </DataTable.Col>
        <DataTable.Col
          source="amount"
          render={(record) => formatAmount(record.amount, currency)}
        />
        <DataTable.Col source="expected_closing_date">
          <DateField source="expected_closing_date" />
        </DataTable.Col>
        <DataTable.Col source="sales_id">
          <ReferenceField source="sales_id" reference="sales" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};

DealTableList.path = "/leads";
