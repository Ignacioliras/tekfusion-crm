import type { Identifier } from "ra-core";

/**
 * Whether the user may edit (move, reorder) a lead: managers any lead, an
 * executive only their own. Mirrors the RLS on deals, which refuses the update
 * of someone else's lead or an unassigned one.
 */
export const canEditDeal = (
  // sales_id is null in the database for an unassigned lead.
  deal: { sales_id?: Identifier | null },
  identityId: Identifier | null | undefined,
  isManager: boolean,
): boolean => isManager || (identityId != null && deal.sales_id === identityId);
