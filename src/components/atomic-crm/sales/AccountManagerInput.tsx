import {
  useCanAccess,
  useGetIdentity,
  useGetList,
  useTranslate,
} from "ra-core";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { useIsMobile } from "@/hooks/use-mobile";

import type { Sale } from "../types";

const MAX_DISPLAYED_SALES = 10;

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;

export const AccountManagerInput = ({
  source = "sales_id",
  placeholder = "crm.common.account_manager",
  label = false,
}: {
  source?: string;
  alwaysOn?: boolean;
  /** i18n key shown when empty. */
  placeholder?: string;
  /** i18n key of a label above the input (filters lined up with selects). */
  label?: string | false;
}) => {
  const translate = useTranslate();
  const isMobile = useIsMobile();
  return (
    <ReferenceInput
      source={source}
      reference="sales"
      filter={{ "disabled@neq": true }}
      sort={{ field: "last_name", order: "ASC" }}
    >
      <AutocompleteInput
        label={label}
        helperText={false}
        clearable
        modal={isMobile}
        optionText={saleOptionRenderer}
        placeholder={translate(placeholder)}
      />
    </ReferenceInput>
  );
};

export const AccountManagerFilter = ({
  className,
  size,
}: {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | null;
}) => {
  const { identity } = useGetIdentity();
  const { canAccess } = useCanAccess({ resource: "sales", action: "list" });
  const { data: sales } = useGetList<Sale>(
    "sales",
    {
      pagination: { page: 1, perPage: MAX_DISPLAYED_SALES },
      sort: { field: "last_name", order: "ASC" },
      filter: { "disabled@neq": true, "id@neq": identity?.id },
    },
    { enabled: canAccess === true && identity?.id != null },
  );

  if (!canAccess || !sales?.length) return null;

  return (
    <>
      {sales.map((sale) => (
        <ToggleFilterButton
          key={sale.id}
          className={className}
          label={
            <span className="min-w-0 truncate">{saleOptionRenderer(sale)}</span>
          }
          size={size}
          value={{ sales_id: sale.id }}
        />
      ))}
    </>
  );
};
