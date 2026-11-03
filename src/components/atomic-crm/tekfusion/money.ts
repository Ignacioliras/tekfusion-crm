// Single place where amounts are formatted (CLAUDE.md: amounts in CLP as integers).
// Chilean format: "$8.719.000", no decimals, "$" symbol.

const LOCALE = "es-CL";

const formatters = new Map<string, Intl.NumberFormat>();

const getFormatter = (
  currency: string,
  compact: boolean,
): Intl.NumberFormat => {
  const key = `${currency}:${compact}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(compact
        ? { notation: "compact", maximumFractionDigits: 1 }
        : { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    });
    formatters.set(key, formatter);
  }
  return formatter;
};

/**
 * Formats an amount for display, e.g. formatAmount(8719000, "CLP") → "$8.719.000".
 * `compact` is for tight spaces such as chart axes: "$8,7 M".
 */
export const formatAmount = (
  amount: number | null | undefined,
  currency: string,
  { compact = false }: { compact?: boolean } = {},
): string => getFormatter(currency, compact).format(amount ?? 0);
