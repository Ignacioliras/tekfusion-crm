import { useGetList, useRecordContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { Badge } from "@/components/ui/badge";

import { TopToolbar } from "../layout/TopToolbar";
import { LINEAS_NEGOCIO } from "../tekfusion/lineas";
import type { Sale, SalesAbsence } from "../types";
import { ROLE_CHOICES } from "./roles";
import type { BusinessLineRecord } from "./userAssignments";

const SalesListActions = () => (
  <TopToolbar>
    <ExportButton />
    <CreateButton label="resources.sales.action.new" />
  </TopToolbar>
);

const filters = [<SearchInput source="q" alwaysOn />];

const ALL = { pagination: { page: 1, perPage: 100 } };

// Every row reads the same two cached queries (react-query dedupes them).
const useAssignments = () => {
  const { data: lines = [] } = useGetList<BusinessLineRecord>(
    "business_lines",
    ALL,
  );
  const { data: absences = [] } = useGetList<SalesAbsence>("sales_absences", {
    ...ALL,
    sort: { field: "starts_on", order: "ASC" },
  });
  const { data: sales = [] } = useGetList<Sale>("sales", ALL);
  return { lines, absences, sales };
};

const isSame = (a: unknown, b: unknown) => a != null && String(a) === String(b);

const lineLabel = (code: string) =>
  LINEAS_NEGOCIO.find((linea) => linea.value === code)?.label ?? code;

const formatDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });

const NameField = (_props: { label?: string }) => {
  const record = useRecordContext<Sale>();
  if (!record) return null;
  return (
    <span className="font-medium">
      {record.first_name} {record.last_name}
    </span>
  );
};

const RoleField = (_props: { label?: string }) => {
  const record = useRecordContext<Sale>();
  const translate = useTranslate();
  if (!record) return null;
  const choice = ROLE_CHOICES.find((role) => role.id === record.role);
  return (
    <div className="flex flex-row gap-1">
      <Badge variant="outline">{translate(choice?.name ?? record.role)}</Badge>
      {record.disabled && (
        <Badge
          variant="outline"
          className="border-orange-300 dark:border-orange-700"
        >
          {translate("resources.sales.fields.disabled")}
        </Badge>
      )}
    </div>
  );
};

const LinesField = (_props: { label?: string }) => {
  const record = useRecordContext<Sale>();
  const { lines } = useAssignments();
  if (!record) return null;
  const owned = lines.filter((line) => isSame(line.owner_sales_id, record.id));
  if (!owned.length) return <span className="text-muted-foreground">—</span>;
  return <span>{owned.map((line) => lineLabel(line.code)).join(", ")}</span>;
};

const SubstituteField = (_props: { label?: string }) => {
  const record = useRecordContext<Sale>();
  const { lines, sales } = useAssignments();
  if (!record) return null;
  const substituteId = lines.find((line) =>
    isSame(line.owner_sales_id, record.id),
  )?.substitute_sales_id;
  const substitute = sales.find((sale) => isSame(sale.id, substituteId));
  if (!substitute) return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      {substitute.first_name} {substitute.last_name}
    </span>
  );
};

const AbsencesField = (_props: { label?: string }) => {
  const record = useRecordContext<Sale>();
  const { absences } = useAssignments();
  if (!record) return null;
  const own = absences.filter((absence) => isSame(absence.sales_id, record.id));
  if (!own.length) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="space-y-0.5">
      {own.map((absence) => (
        <li key={absence.id}>
          {formatDay(absence.starts_on)} – {formatDay(absence.ends_on)}
          {absence.reason && (
            <span className="text-muted-foreground"> · {absence.reason}</span>
          )}
        </li>
      ))}
    </ul>
  );
};

export function SalesList() {
  return (
    <List
      filters={filters}
      actions={<SalesListActions />}
      sort={{ field: "first_name", order: "ASC" }}
    >
      <DataTable bulkActionButtons={false}>
        <DataTable.Col label="resources.sales.fields.name">
          <NameField />
        </DataTable.Col>
        <DataTable.Col source="email" />
        <DataTable.Col label="resources.sales.fields.role">
          <RoleField />
        </DataTable.Col>
        <DataTable.Col label="resources.sales.fields.business_lines">
          <LinesField />
        </DataTable.Col>
        <DataTable.Col label="resources.sales.fields.substitute">
          <SubstituteField />
        </DataTable.Col>
        <DataTable.Col label="resources.sales.fields.absences">
          <AbsencesField />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
