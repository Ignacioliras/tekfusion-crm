// Guards shared by the Edge Functions that act on behalf of a user.
// A disabled user keeps a valid JWT until it expires: the sales row, not the
// token, says whether they may still act (docs/08, baja de usuarios).

export type SaleLike = { disabled?: boolean | null } | null | undefined;

/** True when the sales row exists and is not disabled. */
export const isActiveSale = (sale: SaleLike): boolean =>
  sale != null && sale.disabled !== true;

/**
 * The ban to apply to the auth user: only a change explicitly sent by an
 * administrator counts; anything else keeps the stored value.
 */
export const resolveDisabled = (
  stored: boolean | null | undefined,
  requested: unknown,
  callerIsAdministrator: boolean,
): boolean =>
  callerIsAdministrator && typeof requested === "boolean"
    ? requested
    : stored === true;
