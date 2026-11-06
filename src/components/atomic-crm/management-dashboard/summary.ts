// In-browser mirror of dashboard_summary() and sales_ranking_summary()
// (supabase/schemas/13_tekfusion_dashboard.sql), for FakeRest and the tests.
// Same aggregation: day rows within the range (both ends included) summed per
// group; the average first response is weighted and rounded to 2 decimals,
// null when nobody was answered.
import type {
  DashboardDailyRow,
  DashboardSummaryRow,
  SalesRankingRow,
  SalesRankingSummaryRow,
} from "../types";
import { inRange, ratio, type DayRange } from "./metrics";

const DASHBOARD_SUMS = [
  "leads",
  "contacted",
  "quoted",
  "won",
  "lost",
  "archived",
  "responded",
  "first_response_within_24h",
  "quoted_amount",
  "won_amount",
] as const;

const RANKING_SUMS = [
  "leads",
  "leads_attended",
  "quotes_sent",
  "won",
  "won_amount",
  "lost",
] as const;

type DayRow = { day: string; avg_first_response_hours: number | null };

type Group<Row, Field extends string> = {
  sample: Row;
  totals: Record<Field, number>;
  hoursTotal: number;
};

const groupTotals = <
  Field extends string,
  Row extends DayRow & Record<Field, number>,
>(
  rows: readonly Row[],
  range: DayRange,
  keyOf: (row: Row) => string,
  fields: readonly Field[],
  weight: Field,
): Group<Row, Field>[] => {
  const groups = new Map<string, Group<Row, Field>>();
  for (const row of rows) {
    if (!inRange(row, range)) continue;
    const key = keyOf(row);
    const prev = groups.get(key);
    groups.set(key, {
      sample: prev?.sample ?? row,
      totals: Object.fromEntries(
        fields.map((field) => [field, (prev?.totals[field] ?? 0) + row[field]]),
      ) as Record<Field, number>,
      hoursTotal:
        (prev?.hoursTotal ?? 0) +
        (row.avg_first_response_hours ?? 0) * row[weight],
    });
  }
  return [...groups.values()];
};

const weightedAverage = (hoursTotal: number, weight: number): number | null => {
  const average = ratio(hoursTotal, weight);
  return average === null ? null : Math.round(average * 100) / 100;
};

const monthOf = (day: string): string => `${day.slice(0, 7)}-01`;

export const summarizeDashboard = (
  rows: readonly DashboardDailyRow[],
  range: DayRange,
): DashboardSummaryRow[] =>
  groupTotals(
    rows,
    range,
    (row) => `${monthOf(row.day)}|${row.business_line}|${row.origin_channel}`,
    DASHBOARD_SUMS,
    "responded",
  ).map(({ sample, totals, hoursTotal }) => ({
    month: monthOf(sample.day),
    business_line: sample.business_line,
    origin_channel: sample.origin_channel,
    ...totals,
    avg_first_response_hours: weightedAverage(hoursTotal, totals.responded),
  }));

export const summarizeSalesRanking = (
  rows: readonly SalesRankingRow[],
  range: DayRange,
): SalesRankingSummaryRow[] =>
  groupTotals(
    rows,
    range,
    (row) => String(row.sales_id),
    RANKING_SUMS,
    "leads_attended",
  ).map(({ sample, totals, hoursTotal }) => ({
    sales_id: sample.sales_id,
    ...totals,
    avg_first_response_hours: weightedAverage(
      hoursTotal,
      totals.leads_attended,
    ),
  }));
