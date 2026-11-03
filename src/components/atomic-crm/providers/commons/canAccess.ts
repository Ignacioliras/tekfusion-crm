// FIXME: This should be exported from the ra-core package
type CanAccessParams<
  RecordType extends Record<string, any> = Record<string, any>,
> = {
  action: string;
  resource: string;
  record?: RecordType;
};

// Actions that only read: the TekFusion reader role (sales.role = 'reader')
// gets these and nothing else. The database enforces the same rule (RLS);
// this keeps the interface from offering what the database would refuse.
const READ_ACTIONS = ["list", "show"];

export type AccessRole = "admin" | "user" | "reader";

/** The access role of a sales row: TekFusion's role first, Atomic's flag second. */
export const getAccessRole = (sale: {
  administrator?: boolean;
  role?: string;
}): AccessRole =>
  sale.role === "reader" ? "reader" : sale.administrator ? "admin" : "user";

export const canAccess = <
  RecordType extends Record<string, any> = Record<string, any>,
>(
  role: string,
  params: CanAccessParams<RecordType>,
) => {
  if (role === "admin") {
    return true;
  }

  // Exporting a CSV takes the data out of the CRM: managers only (docs/08).
  if (params.action === "export") {
    return false;
  }

  if (role === "reader" && !READ_ACTIONS.includes(params.action)) {
    return false;
  }

  // Non admins can't access the sales resource
  if (params.resource === "sales") {
    return false;
  }

  // Non admins can't access the configuration resource
  if (params.resource === "configuration") {
    return false;
  }

  return true;
};
