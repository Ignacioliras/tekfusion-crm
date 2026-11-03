import { useGetList, useRecordContext, useTranslate } from "ra-core";
import { useWatch } from "react-hook-form";
import { ArrayInput } from "@/components/admin/array-input";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { TextInput } from "@/components/admin/text-input";

import { LINEAS_NEGOCIO, LINEA_INDETERMINADA } from "../tekfusion/lineas";
import type { Sale } from "../types";
import { endsOnOrAfterStart, notSelf } from "./userAssignments";

const LINE_CHOICES = LINEAS_NEGOCIO.filter(
  (linea) => linea.value !== LINEA_INDETERMINADA,
).map((linea) => ({ id: linea.value, name: linea.label }));

/** Business lines, substitute and absences of a user (edit form only). */
export const UserAssignmentInputs = () => {
  const translate = useTranslate();
  const record = useRecordContext<Sale>();
  const lineCodes = useWatch({ name: "line_codes" }) as string[] | undefined;
  const { data: sales = [] } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "first_name", order: "ASC" },
  });
  // A substitute takes leads: managers and executives only, never the user itself.
  const substituteChoices = sales
    .filter(
      (sale) =>
        sale.id !== record?.id && !sale.disabled && sale.role !== "reader",
    )
    .map((sale) => ({
      id: sale.id,
      name: `${sale.first_name} ${sale.last_name}`,
    }));

  return (
    <div className="space-y-4 w-full">
      <h3 className="text-base font-semibold pt-2">
        {translate("resources.sales.sections.assignment")}
      </h3>
      <AutocompleteArrayInput
        source="line_codes"
        choices={LINE_CHOICES}
        label="resources.sales.fields.business_lines"
        helperText="resources.sales.helpers.business_lines"
      />
      <SelectInput
        source="substitute_sales_id"
        choices={substituteChoices}
        label="resources.sales.fields.substitute"
        helperText="resources.sales.helpers.substitute"
        disabled={!lineCodes?.length}
        validate={notSelf(record?.id)}
        emptyText="resources.sales.fields.no_substitute"
      />
      <ArrayInput
        source="absences"
        label="resources.sales.fields.absences"
        helperText={false}
      >
        <SimpleFormIterator inline disableReordering getItemLabel={false}>
          <DateInput
            source="starts_on"
            label="resources.sales.fields.starts_on"
            helperText={false}
            required
          />
          <DateInput
            source="ends_on"
            label="resources.sales.fields.ends_on"
            helperText={false}
            required
            validate={endsOnOrAfterStart}
          />
          <TextInput
            source="reason"
            label="resources.sales.fields.absence_reason"
            helperText={false}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </div>
  );
};
