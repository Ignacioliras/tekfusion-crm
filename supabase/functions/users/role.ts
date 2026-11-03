// sales.role is the source of truth (manager / executive / reader); the
// sync_sales_role trigger keeps `administrator` in step. A client that still
// sends only `administrator` (Atomic's original form) keeps working.

export const USER_ROLES = ["manager", "executive", "reader"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" &&
  (USER_ROLES as readonly string[]).includes(value);

/** Columns to write on sales for the requested role, or null when nothing was asked. */
export const roleUpdate = (
  role: unknown,
  administrator: unknown,
): { role: UserRole } | { administrator: boolean } | null => {
  if (isUserRole(role)) return { role };
  if (typeof administrator === "boolean") return { administrator };
  return null;
};
