// Pure calculations of the management dashboard (RF-11) over dashboard_summary
// rows. Every ratio returns null when its denominator is zero; the UI shows "—".
import type { DashboardSummaryRow, SalesRankingSummaryRow } from "../types";
import type { Etapa } from "../tekfusion/estados";
import { addDays, santiagoDay } from "../tekfusion/santiago";

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

const addRow = (totals: Totals, row: DashboardSummaryRow): Totals => ({
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

export const sumRows = (rows: readonly DashboardSummaryRow[]): Totals =>
  rows.reduce(addRow, ZERO);

/** Totals per value of a column, e.g. per business_line. */
export const totalsBy = (
  rows: readonly DashboardSummaryRow[],
  key: "business_line" | "origin_channel" | "month",
): Map<string, Totals> =>
  rows.reduce((groups, row) => {
    // "month": "YYYY-MM" of the row's month ("YYYY-MM-01").
    const group = key === "month" ? row.month.slice(0, 7) : row[key];
    const next = new Map(groups);
    next.set(group, addRow(groups.get(group) ?? ZERO, row));
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

// Ranges are calendar days in America/Santiago, "YYYY-MM-DD", both ends included.
export type DayRange = { from: string; to: string };

export const PRESETS = [
  "this_month",
  "last_month",
  "last_30_days",
  "last_90_days",
  "last_12_months",
  "this_year",
] as const;
export type Preset = (typeof PRESETS)[number];

// Decision of 2026-11-05 (docs/10): the dashboard opens on the last 30 days.
export const DEFAULT_PRESET: Preset = "last_30_days";

/** The range a shortcut stands for, as of today in Santiago. */
export const presetRange = (
  preset: Preset,
  now: Date = new Date(),
): DayRange => {
  const today = santiagoDay(now);
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  switch (preset) {
    case "this_month":
      return { from: firstOfMonth, to: today };
    case "last_month": {
      const lastDay = addDays(firstOfMonth, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    case "last_30_days":
      return { from: addDays(today, -29), to: today };
    case "last_90_days":
      return { from: addDays(today, -89), to: today };
    case "last_12_months":
      // The day after this same day a year ago (from Feb 29: Mar 2).
      return {
        from: new Date(
          Date.UTC(
            +today.slice(0, 4) - 1,
            +today.slice(5, 7) - 1,
            +today.slice(8, 10) + 1,
          ),
        )
          .toISOString()
          .slice(0, 10),
        to: today,
      };
    case "this_year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
};

const dayNumber = (day: string): number =>
  Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) /
  86_400_000;

/** The range of the same number of days right before it. */
export const previousRange = ({ from, to }: DayRange): DayRange => {
  const length = dayNumber(to) - dayNumber(from) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
};

/** Whether a view row ("YYYY-MM-DD") falls in the range. */
export const inRange = (
  row: { day: string },
  { from, to }: DayRange,
): boolean => row.day >= from && row.day <= to;

/**
 * The sales_ranking_summary rows (already one per executive and summed over the
 * range) sorted by won amount, then won leads, descending. Returns a new array.
 */
export const rankSales = (
  rows: readonly SalesRankingSummaryRow[],
): SalesRankingSummaryRow[] =>
  [...rows].sort((a, b) => b.won_amount - a.won_amount || b.won - a.won);
