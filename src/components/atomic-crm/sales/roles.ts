import type { SalesFormData, UserRole } from "../types";

export const ROLE_CHOICES: { id: UserRole; name: string }[] = [
  { id: "manager", name: "resources.sales.roles.manager" },
  { id: "executive", name: "resources.sales.roles.executive" },
  { id: "reader", name: "resources.sales.roles.reader" },
];

/** `administrator` follows the role, as the sync_sales_role trigger does in the database. */
export const withRole = <T extends Partial<SalesFormData>>(data: T): T =>
  data.role ? { ...data, administrator: data.role === "manager" } : data;
