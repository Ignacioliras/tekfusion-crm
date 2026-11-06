import { describe, expect, it } from "vitest";

import type { DashboardDailyRow, SalesRankingRow } from "../types";
import { summarizeDashboard, summarizeSalesRanking } from "./summary";

const day = (overrides: Partial<DashboardDailyRow>): DashboardDailyRow => ({
  id: 1,
  day: "2026-10-15",
  business_line: "valvulas",
  origin_channel: "correo",
  leads: 0,
  contacted: 0,
  quoted: 0,
  won: 0,
  lost: 0,
  archived: 0,
  responded: 0,
  first_response_within_24h: 0,
  avg_first_response_hours: null,
  quoted_amount: 0,
  won_amount: 0,
  ...overrides,
});

const rankingDay = (overrides: Partial<SalesRankingRow>): SalesRankingRow => ({
  id: 1,
  day: "2026-10-15",
  sales_id: 1,
  leads: 0,
  leads_attended: 0,
  avg_first_response_hours: null,
  quotes_sent: 0,
  won: 0,
  won_amount: 0,
  lost: 0,
  ...overrides,
});

const OCTOBER_TO_NOVEMBER = { from: "2026-10-01", to: "2026-11-30" };

describe("summarizeDashboard", () => {
  it("sums the day rows per month, business line and origin channel", () => {
    const rows = [
      day({ day: "2026-10-02", leads: 2, won: 1, won_amount: 1_500_000 }),
      day({ day: "2026-10-20", leads: 3, quoted: 2, quoted_amount: 800_000 }),
      day({ day: "2026-10-20", origin_channel: "whatsapp", leads: 4 }),
      day({ day: "2026-10-21", business_line: "tuberias", leads: 1 }),
      day({ day: "2026-11-03", leads: 5, archived: 1 }),
    ];

    const summary = summarizeDashboard(rows, OCTOBER_TO_NOVEMBER);

    expect(summary).toHaveLength(4);
    expect(summary).toContainEqual(
      expect.objectContaining({
        month: "2026-10-01",
        business_line: "valvulas",
        origin_channel: "correo",
        leads: 5,
        quoted: 2,
        won: 1,
        quoted_amount: 800_000,
        won_amount: 1_500_000,
      }),
    );
    expect(summary).toContainEqual(
      expect.objectContaining({
        month: "2026-10-01",
        origin_channel: "whatsapp",
        leads: 4,
      }),
    );
    expect(summary).toContainEqual(
      expect.objectContaining({
        month: "2026-10-01",
        business_line: "tuberias",
        leads: 1,
      }),
    );
    expect(summary).toContainEqual(
      expect.objectContaining({ month: "2026-11-01", leads: 5, archived: 1 }),
    );
  });

  it("includes both ends of the range and leaves out the days outside", () => {
    const rows = [
      day({ day: "2026-09-30", leads: 100 }),
      day({ day: "2026-10-01", leads: 1 }),
      day({ day: "2026-11-30", leads: 2 }),
      day({ day: "2026-12-01", leads: 100 }),
    ];

    const summary = summarizeDashboard(rows, OCTOBER_TO_NOVEMBER);

    expect(summary.map(({ month, leads }) => ({ month, leads }))).toEqual([
      { month: "2026-10-01", leads: 1 },
      { month: "2026-11-01", leads: 2 },
    ]);
  });

  it("weights the average first response by the responded leads, to 2 decimals", () => {
    const rows = [
      day({ day: "2026-10-01", responded: 1, avg_first_response_hours: 2 }),
      day({ day: "2026-10-02", responded: 2, avg_first_response_hours: 3.5 }),
      day({ day: "2026-10-03", responded: 0, avg_first_response_hours: null }),
    ];

    const [october] = summarizeDashboard(rows, OCTOBER_TO_NOVEMBER);

    // (2 × 1 + 3.5 × 2) / 3 = 3
    expect(october.responded).toBe(3);
    expect(october.avg_first_response_hours).toBe(3);
    expect(
      summarizeDashboard(
        [
          day({ responded: 1, avg_first_response_hours: 1 }),
          day({ responded: 2, avg_first_response_hours: 2 }),
        ],
        OCTOBER_TO_NOVEMBER,
      )[0].avg_first_response_hours,
    ).toBe(1.67);
  });

  it("returns a null average when nobody was answered", () => {
    const [october] = summarizeDashboard(
      [day({ leads: 3, responded: 0 })],
      OCTOBER_TO_NOVEMBER,
    );

    expect(october.leads).toBe(3);
    expect(october.avg_first_response_hours).toBeNull();
  });
});

describe("summarizeSalesRanking", () => {
  it("sums one line per executive within the range", () => {
    const rows = [
      rankingDay({
        sales_id: 1,
        day: "2026-10-05",
        leads: 3,
        leads_attended: 2,
        avg_first_response_hours: 4,
        quotes_sent: 2,
        won: 1,
        won_amount: 2_000_000,
      }),
      rankingDay({
        sales_id: 1,
        day: "2026-11-10",
        leads: 1,
        leads_attended: 2,
        avg_first_response_hours: 1,
        lost: 1,
      }),
      rankingDay({ sales_id: 2, day: "2026-10-06", leads: 4 }),
      rankingDay({ sales_id: 2, day: "2026-12-01", leads: 50, won: 9 }),
    ];

    const ranking = summarizeSalesRanking(rows, OCTOBER_TO_NOVEMBER);

    expect(ranking).toHaveLength(2);
    expect(ranking).toContainEqual({
      sales_id: 1,
      leads: 4,
      leads_attended: 4,
      avg_first_response_hours: 2.5,
      quotes_sent: 2,
      won: 1,
      won_amount: 2_000_000,
      lost: 1,
    });
    expect(ranking).toContainEqual({
      sales_id: 2,
      leads: 4,
      leads_attended: 0,
      avg_first_response_hours: null,
      quotes_sent: 0,
      won: 0,
      won_amount: 0,
      lost: 0,
    });
  });
});
