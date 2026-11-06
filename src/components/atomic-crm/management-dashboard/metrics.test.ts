import { buildRankingRow, buildRow } from "./ManagementDashboard.fixtures";
import {
  EMPTY_VALUE,
  avgFirstResponseHours,
  closeRate,
  formatHours,
  formatPercent,
  funnel,
  inRange,
  presetRange,
  previousRange,
  rankSales,
  sumRows,
  totalsBy,
  within24hRate,
} from "./metrics";
import { summarizeDashboard } from "./summary";

const YEAR = { from: "2026-01-01", to: "2026-12-31" };

const rows = [
  buildRow({
    day: "2026-10-15",
    business_line: "valvulas",
    origin_channel: "correo",
    leads: 4,
    contacted: 3,
    quoted: 2,
    won: 1,
    lost: 1,
    responded: 3,
    first_response_within_24h: 2,
    avg_first_response_hours: 10,
    quoted_amount: 5_000_000,
    won_amount: 2_000_000,
  }),
  buildRow({
    day: "2026-11-03",
    business_line: "tuberias",
    origin_channel: "correo",
    leads: 2,
    contacted: 1,
    quoted: 1,
    won: 0,
    lost: 2,
    responded: 1,
    first_response_within_24h: 1,
    avg_first_response_hours: 4,
    quoted_amount: 1_000_000,
  }),
];
// The rows as dashboard_summary returns them: one per month, line and channel.
const summary = summarizeDashboard(rows, YEAR);

describe("metrics del dashboard de gerencia", () => {
  it("adds up counts and amounts across rows", () => {
    const totals = sumRows(summary);
    expect(totals).toMatchObject({
      leads: 6,
      contacted: 4,
      quoted: 3,
      won: 1,
      lost: 3,
      responded: 4,
      firstResponseWithin24h: 3,
      quotedAmount: 6_000_000,
      wonAmount: 2_000_000,
    });
  });

  it("computes the share within 24 h over the responded leads", () => {
    expect(within24hRate(sumRows(summary))).toBe(0.75);
  });

  it("weights the average first response by responded leads", () => {
    // (10 h × 3 + 4 h × 1) / 4 = 8,5 h
    expect(avgFirstResponseHours(sumRows(summary))).toBe(8.5);
    expect(formatHours(8.5)).toBe("8,5 h");
  });

  it("computes the close rate as won / (won + lost)", () => {
    expect(closeRate(sumRows(summary))).toBe(0.25);
    expect(formatPercent(0.25)).toBe("25%");
  });

  it("returns the funnel nuevo → contactado → cotizado → ganado", () => {
    expect(funnel(sumRows(summary))).toEqual([
      { stage: "nuevo", value: 6 },
      { stage: "contactado", value: 4 },
      { stage: "cotizado", value: 3 },
      { stage: "ganado", value: 1 },
    ]);
  });

  it("groups totals by line, channel and month", () => {
    expect(totalsBy(summary, "business_line").get("tuberias")?.lost).toBe(2);
    expect(totalsBy(summary, "origin_channel").get("correo")?.leads).toBe(6);
  });

  it("returns null and shows a dash instead of dividing by zero", () => {
    const empty = sumRows([]);
    expect(within24hRate(empty)).toBeNull();
    expect(closeRate(empty)).toBeNull();
    expect(avgFirstResponseHours(empty)).toBeNull();
    expect(formatPercent(null)).toBe(EMPTY_VALUE);
    expect(formatHours(null)).toBe(EMPTY_VALUE);
    // Leads that nobody answered yet: no average, no share.
    const unanswered = sumRows(
      summarizeDashboard([buildRow({ day: "2026-10-15", leads: 3 })], YEAR),
    );
    expect(formatPercent(within24hRate(unanswered))).toBe("—");
    expect(formatHours(avgFirstResponseHours(unanswered))).toBe("—");
  });

  it("builds the previous range of the same number of days", () => {
    expect(previousRange({ from: "2026-10-07", to: "2026-11-05" })).toEqual({
      from: "2026-09-07",
      to: "2026-10-06",
    });
    // Across a year and a leap day.
    expect(previousRange({ from: "2028-03-01", to: "2028-03-01" })).toEqual({
      from: "2028-02-29",
      to: "2028-02-29",
    });
  });

  it("turns each shortcut into a range as of today in Santiago", () => {
    // 2026-11-06 02:00 UTC is still November 5 in Santiago.
    const now = new Date("2026-11-06T02:00:00Z");
    expect(presetRange("last_30_days", now)).toEqual({
      from: "2026-10-07",
      to: "2026-11-05",
    });
    expect(presetRange("this_month", now)).toEqual({
      from: "2026-11-01",
      to: "2026-11-05",
    });
    expect(presetRange("last_month", now)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(presetRange("last_90_days", now).from).toBe("2026-08-08");
    expect(presetRange("this_year", now)).toEqual({
      from: "2026-01-01",
      to: "2026-11-05",
    });
  });

  it("filters rows by day range and groups them by month", () => {
    expect(inRange(rows[0], { from: "2026-10-01", to: "2026-10-31" })).toBe(
      true,
    );
    expect(inRange(rows[1], { from: "2026-10-01", to: "2026-10-31" })).toBe(
      false,
    );
    expect([...totalsBy(summary, "month").keys()]).toEqual([
      "2026-10",
      "2026-11",
    ]);
  });

  it("ranks executives by won amount over the days in range", () => {
    const ranking = [
      buildRankingRow({
        day: "2026-10-15",
        sales_id: 1,
        leads: 3,
        leads_attended: 2,
        avg_first_response_hours: 10,
        quotes_sent: 2,
        won: 1,
        won_amount: 1_000_000,
      }),
      buildRankingRow({
        day: "2026-11-03",
        sales_id: 1,
        leads: 2,
        leads_attended: 2,
        avg_first_response_hours: 4,
        quotes_sent: 1,
        won: 1,
        won_amount: 500_000,
      }),
      buildRankingRow({
        day: "2026-11-03",
        sales_id: 2,
        leads: 4,
        leads_attended: 1,
        avg_first_response_hours: 2,
        quotes_sent: 3,
        won: 2,
        won_amount: 4_000_000,
      }),
      buildRankingRow({
        day: "2026-09-20",
        sales_id: 3,
        leads: 9,
        won: 9,
        won_amount: 9_000_000,
      }),
    ];

    const result = rankSales(ranking, { from: "2026-10-01", to: "2026-11-30" });

    expect(result.map((line) => line.salesId)).toEqual([2, 1]);
    // (10 h × 2 + 4 h × 2) / 4 = 7 h
    expect(result[1]).toEqual({
      salesId: 1,
      leads: 5,
      leadsAttended: 4,
      avgFirstResponseHours: 7,
      quotesSent: 3,
      won: 2,
      wonAmount: 1_500_000,
    });
    expect(
      rankSales(ranking, { from: "2026-11-01", to: "2026-11-30" })[1].wonAmount,
    ).toBe(500_000);
    expect(
      rankSales(ranking, { from: "2026-12-01", to: "2026-12-31" }),
    ).toEqual([]);
  });
});
