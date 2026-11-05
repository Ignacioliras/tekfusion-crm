import { buildRankingRow, buildRow } from "./ManagementDashboard.fixtures";
import {
  EMPTY_VALUE,
  avgFirstResponseHours,
  closeRate,
  currentMonth,
  formatHours,
  formatPercent,
  funnel,
  inRange,
  previousRange,
  rankSales,
  shiftMonth,
  sumRows,
  totalsBy,
  within24hRate,
} from "./metrics";

const rows = [
  buildRow({
    month: "2026-10-01",
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
    month: "2026-11-01",
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

describe("metrics del dashboard de gerencia", () => {
  it("adds up counts and amounts across rows", () => {
    const totals = sumRows(rows);
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
    expect(within24hRate(sumRows(rows))).toBe(0.75);
  });

  it("weights the average first response by responded leads", () => {
    // (10 h × 3 + 4 h × 1) / 4 = 8,5 h
    expect(avgFirstResponseHours(sumRows(rows))).toBe(8.5);
    expect(formatHours(8.5)).toBe("8,5 h");
  });

  it("computes the close rate as won / (won + lost)", () => {
    expect(closeRate(sumRows(rows))).toBe(0.25);
    expect(formatPercent(0.25)).toBe("25%");
  });

  it("returns the funnel nuevo → contactado → cotizado → ganado", () => {
    expect(funnel(sumRows(rows))).toEqual([
      { stage: "nuevo", value: 6 },
      { stage: "contactado", value: 4 },
      { stage: "cotizado", value: 3 },
      { stage: "ganado", value: 1 },
    ]);
  });

  it("groups totals by line, channel and month", () => {
    expect(totalsBy(rows, "business_line").get("tuberias")?.lost).toBe(2);
    expect(totalsBy(rows, "origin_channel").get("correo")?.leads).toBe(6);
    expect([...totalsBy(rows, "month").keys()]).toEqual([
      "2026-10-01",
      "2026-11-01",
    ]);
  });

  it("returns null and shows a dash instead of dividing by zero", () => {
    const empty = sumRows([]);
    expect(within24hRate(empty)).toBeNull();
    expect(closeRate(empty)).toBeNull();
    expect(avgFirstResponseHours(empty)).toBeNull();
    expect(formatPercent(null)).toBe(EMPTY_VALUE);
    expect(formatHours(null)).toBe(EMPTY_VALUE);
    // Leads that nobody answered yet: no average, no share.
    const unanswered = sumRows([buildRow({ leads: 3 })]);
    expect(formatPercent(within24hRate(unanswered))).toBe("—");
    expect(formatHours(avgFirstResponseHours(unanswered))).toBe("—");
  });

  it("shifts months across years and builds the previous range", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(previousRange("2026-11", "2026-11")).toEqual({
      from: "2026-10",
      to: "2026-10",
    });
    expect(previousRange("2026-01", "2026-03")).toEqual({
      from: "2025-10",
      to: "2025-12",
    });
  });

  it("takes the current month in Santiago and filters rows by range", () => {
    // 2026-12-01 02:00 UTC is still November 30 in Santiago.
    expect(currentMonth(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
    expect(inRange(rows[0], "2026-10", "2026-10")).toBe(true);
    expect(inRange(rows[1], "2026-10", "2026-10")).toBe(false);
  });

  it("ranks executives by won amount over the months in range", () => {
    const ranking = [
      buildRankingRow({
        month: "2026-10-01",
        sales_id: 1,
        leads: 3,
        leads_attended: 2,
        avg_first_response_hours: 10,
        quotes_sent: 2,
        won: 1,
        won_amount: 1_000_000,
      }),
      buildRankingRow({
        month: "2026-11-01",
        sales_id: 1,
        leads: 2,
        leads_attended: 2,
        avg_first_response_hours: 4,
        quotes_sent: 1,
        won: 1,
        won_amount: 500_000,
      }),
      buildRankingRow({
        month: "2026-11-01",
        sales_id: 2,
        leads: 4,
        leads_attended: 1,
        avg_first_response_hours: 2,
        quotes_sent: 3,
        won: 2,
        won_amount: 4_000_000,
      }),
      buildRankingRow({
        month: "2026-09-01",
        sales_id: 3,
        leads: 9,
        won: 9,
        won_amount: 9_000_000,
      }),
    ];

    const result = rankSales(ranking, "2026-10", "2026-11");

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
    expect(rankSales(ranking, "2026-11", "2026-11")[1].wonAmount).toBe(500_000);
    expect(rankSales(ranking, "2026-12", "2026-12")).toEqual([]);
  });
});
