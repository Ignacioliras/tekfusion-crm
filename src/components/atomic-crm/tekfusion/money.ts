// Single place where amounts are formatted (CLAUDE.md: amounts in CLP as integers).
// Chilean format: "$8.719.000", no decimals, "$" symbol.

const LOCALE = "es-CL";

const formatters = new Map<string, Intl.NumberFormat>();

const getFormatter = (currency: string): Intl.NumberFormat => {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
};

/** Formats an amount for display, e.g. formatAmount(8719000, "CLP") → "$8.719.000". */
export const formatAmount = (
  amount: number | null | undefined,
  currency: string,
): string => getFormatter(currency).format(amount ?? 0);
