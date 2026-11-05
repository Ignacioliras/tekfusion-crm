import type { Identifier } from "ra-core";
import { useGetManyAggregate, useTranslate } from "ra-core";

export const useGetSalesName = (
  id?: Identifier,
  options?: { enabled?: boolean },
) => {
  const translate = useTranslate();
  const enabled = (options?.enabled ?? true) && id != null;
  const { data, error } = useGetManyAggregate(
    "sales",
    { ids: id !== null ? [id] : undefined },
    { enabled },
  );

  // No author: written by the system (n8n ingestion, imports), not a person.
  if (id == null) return translate("tekfusion.activity.system");
  return data && data[0]
    ? `${data[0].first_name} ${data[0].last_name}`
    : error
      ? "??"
      : "";
};
