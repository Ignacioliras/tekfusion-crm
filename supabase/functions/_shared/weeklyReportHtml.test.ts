import { describe, expect, it } from "vitest";
import {
  formatClp,
  formatWeek,
  renderWeeklyReport,
  type WeeklyReportData,
} from "./weeklyReportHtml";

const options = {
  crmBaseUrl: "https://staging.crm.example.cl/",
  weekStart: "2026-11-02",
};

const emptyWeek: WeeklyReportData = {
  entries: 0,
  contacted: 0,
  quoted: 0,
  won: 0,
  won_amount: 0,
  lost: 0,
  lost_by_reason: [],
  unattended: 0,
  overdue_followups: 0,
};

const busyWeek: WeeklyReportData = {
  entries: 1234,
  contacted: 18,
  quoted: 9,
  won: 3,
  won_amount: 12_500_000,
  lost: 4,
  lost_by_reason: [
    { reason: "Precio", count: 2 },
    { reason: "<script>alert(1)</script>", count: 1 },
    { reason: null, count: 1 },
  ],
  unattended: 5,
  overdue_followups: 2,
};

describe("renderWeeklyReport", () => {
  it("says there was no movement in an empty week and draws no table", () => {
    const report = renderWeeklyReport(emptyWeek, options);

    expect(report.subject).toBe(
      "Reporte semanal TekFusion: semana del 2 de noviembre de 2026 al 8 de noviembre de 2026",
    );
    expect(report.html).toContain("Sin movimiento esta semana");
    expect(report.html).not.toContain("<table");
    expect(report.html).not.toContain("Perdidos por motivo");
    expect(report.text).toContain("Sin movimiento esta semana");
    expect(report.text).toContain("Seguimientos vencidos: 0");
  });

  it("shows the figures, the lost reasons and the CRM link of a busy week", () => {
    const report = renderWeeklyReport(busyWeek, options);

    for (const out of [report.html, report.text]) {
      expect(out).toContain("1.234");
      expect(out).toContain("$12.500.000");
      expect(out).toContain("Precio");
      expect(out).toContain("Sin motivo");
      expect(out).toContain("Sin atender (más de 24 h sin contacto): 5");
      expect(out).toContain("Seguimientos vencidos: 2");
    }
    expect(report.html).toContain(
      'href="https://staging.crm.example.cl/deals"',
    );
    expect(report.text).toContain(
      "Ver leads en el CRM: https://staging.crm.example.cl/deals",
    );
    expect(report.html).not.toContain("Sin movimiento");
  });

  it("escapes HTML coming from the database and keeps it readable in text", () => {
    const report = renderWeeklyReport(busyWeek, options);

    expect(report.html).not.toContain("<script>");
    expect(report.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(report.text).toContain("<script>alert(1)</script>");
  });

  it("uses inline styles only, with no stylesheet or external resource", () => {
    const { html } = renderWeeklyReport(busyWeek, options);

    expect(html).not.toMatch(/<style|<link|<img|<script|src=/i);
    expect(html).toContain('style="');
  });
});

describe("formatters", () => {
  it("formats CLP with the Chilean thousands separator", () => {
    expect(formatClp(0)).toBe("$0");
    expect(formatClp(1500)).toBe("$1.500");
    expect(formatClp(1_234_567)).toBe("$1.234.567");
  });

  it("keeps the Santiago calendar day of week_start", () => {
    expect(formatWeek("2026-12-28")).toBe(
      "28 de diciembre de 2026 al 3 de enero de 2027",
    );
    expect(() => formatWeek("no-es-fecha")).toThrow();
  });
});
