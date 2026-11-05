// Pure calculations of the management dashboard (RF-11) over dashboard_monthly
// rows. Every ratio returns null when its denominator is zero; the UI shows "—".
import type { Identifier } from "ra-core";

import type { DashboardMonthlyRow, SalesRankingRow } from "../types";
import type { Etapa } from "../tekfusion/estados";

export const EMPTY_VALUE = "—";

export type Totals = {
  leads: number;
  contacted: number;
  quoted: number;
  won: number;
  lost: number;
  responded: number;
  firstResponseWithin24h: number;
  // Sum of avg_first_response_hours × responded, to average across rows.
  responseHoursTotal: number;
  quotedAmount: number;
  wonAmount: number;
};

const ZERO: Totals = {
  leads: 0,
  contacted: 0,
  quoted: 0,
  won: 0,
  lost: 0,
  responded: 0,
  firstResponseWithin24h: 0,
  responseHoursTotal: 0,
  quotedAmount: 0,
  wonAmount: 0,
};

const addRow = (totals: Totals, row: DashboardMonthlyRow): Totals => ({
  leads: totals.leads + row.leads,
  contacted: totals.contacted + row.contacted,
  quoted: totals.quoted + row.quoted,
  won: totals.won + row.won,
  lost: totals.lost + row.lost,
  responded: totals.responded + row.responded,
  firstResponseWithin24h:
    totals.firstResponseWithin24h + row.first_response_within_24h,
  responseHoursTotal:
    totals.responseHoursTotal +
    (row.avg_first_response_hours ?? 0) * row.responded,
  quotedAmount: totals.quotedAmount + row.quoted_amount,
  wonAmount: totals.wonAmount + row.won_amount,
});

export const sumRows = (rows: readonly DashboardMonthlyRow[]): Totals =>
  rows.reduce(addRow, ZERO);

/** Totals per value of a column, e.g. per business_line. */
export const totalsBy = (
  rows: readonly DashboardMonthlyRow[],
  key: "business_line" | "origin_channel" | "month",
): Map<string, Totals> =>
  rows.reduce((groups, row) => {
    const next = new Map(groups);
    next.set(row[key], addRow(groups.get(row[key]) ?? ZERO, row));
    return next;
  }, new Map<string, Totals>());

export const ratio = (numerator: number, denominator: number): number | null =>
  denominator === 0 ? null : numerator / denominator;

/** Share of the responded leads that got their first answer within 24 h. */
export const within24hRate = (totals: Totals): number | null =>
  ratio(totals.firstResponseWithin24h, totals.responded);

/** won / (won + lost): open and archived leads do not count. */
export const closeRate = (totals: Totals): number | null =>
  ratio(totals.won, totals.won + totals.lost);

/** Average hours to first response, weighted by the responded leads of each row. */
export const avgFirstResponseHours = (totals: Totals): number | null =>
  ratio(totals.responseHoursTotal, totals.responded);

export const funnel = (
  totals: Totals,
): Array<{ stage: Etapa; value: number }> => [
  { stage: "nuevo", value: totals.leads },
  { stage: "contactado", value: totals.contacted },
  { stage: "cotizado", value: totals.quoted },
  { stage: "ganado", value: totals.won },
];

export const formatPercent = (value: number | null): string =>
  value === null ? EMPTY_VALUE : `${Math.round(value * 100)}%`;

const hoursFormat = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
});

export const formatHours = (value: number | null): string =>
  value === null ? EMPTY_VALUE : `${hoursFormat.format(value)} h`;

// Months are "YYYY-MM" (the value of <input type="month">).
export const shiftMonth = (month: string, delta: number): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
};

const monthIndex = (month: string): number => {
  const [year, monthNumber] = month.split("-").map(Number);
  return year * 12 + monthNumber;
};

/** The range of the same length right before [from, to]. */
export const previousRange = (
  from: string,
  to: string,
): { from: string; to: string } => {
  const length = monthIndex(to) - monthIndex(from) + 1;
  return { from: shiftMonth(from, -length), to: shiftMonth(to, -length) };
};

/** Current month in America/Santiago, "YYYY-MM". */
export const currentMonth = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  })
    .format(now)
    .slice(0, 7);

/** Whether a view row ("YYYY-MM-01") falls in [from, to] ("YYYY-MM"). */
export const inRange = (
  row: { month: string },
  from: string,
  to: string,
): boolean => {
  const month = row.month.slice(0, 7);
  return month >= from && month <= to;
};

export type SalesRankingTotals = {
  salesId: Identifier;
  leads: number;
  leadsAttended: number;
  avgFirstResponseHours: number | null;
  quotesSent: number;
  won: number;
  wonAmount: number;
};

/**
 * One line per executive over the sales_ranking rows within [from, to], sorted
 * by won amount (then won leads) descending. The average first response is
 * weighted by the attended leads of each month.
 */
export const rankSales = (
  rows: readonly SalesRankingRow[],
  from: string,
  to: string,
): SalesRankingTotals[] => {
  const groups = rows
    .filter((row) => inRange(row, from, to))
    .reduce((acc, row) => {
      const prev = acc.get(row.sales_id);
      const next = new Map(acc);
      next.set(row.sales_id, {
        leads: (prev?.leads ?? 0) + row.leads,
        leadsAttended: (prev?.leadsAttended ?? 0) + row.leads_attended,
        hoursTotal:
          (prev?.hoursTotal ?? 0) +
          (row.avg_first_response_hours ?? 0) * row.leads_attended,
        quotesSent: (prev?.quotesSent ?? 0) + row.quotes_sent,
        won: (prev?.won ?? 0) + row.won,
        wonAmount: (prev?.wonAmount ?? 0) + row.won_amount,
      });
      return next;
    }, new Map<Identifier, { leads: number; leadsAttended: number; hoursTotal: number; quotesSent: number; won: number; wonAmount: number }>());

  return [...groups.entries()]
    .map(([salesId, { hoursTotal, ...totals }]) => ({
      salesId,
      ...totals,
      avgFirstResponseHours: ratio(hoursTotal, totals.leadsAttended),
    }))
    .sort((a, b) => b.wonAmount - a.wonAmount || b.won - a.won);
};
