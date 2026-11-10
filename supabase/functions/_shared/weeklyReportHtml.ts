// Weekly e-mail for management (RF-12), built from one row of
// public.weekly_report_data(week_start) (schemas/15_tekfusion_weekly_report.sql).
// The RPC returns no lead ids, so the pending section links to the lead list,
// not to each lead's page. It does not return by_business_line yet either
// (docs/10, decision 5): until it does, the per-line table is simply omitted.
// Every string that comes from the database is escaped (CLAUDE.md rule 11).

/** Same counts as the totals, for one business_line (enum code). */
export type WeeklyReportLine = {
  business_line: string;
  entries: number;
  contacted: number;
  quoted: number;
  won: number;
  /** CLP, integer. */
  won_amount: number;
  lost: number;
};

/** One row of weekly_report_data. bigint columns arrive as JSON numbers. */
export type WeeklyReportData = {
  /** Not returned by the RPC yet; absent or empty = no per-line table. */
  by_business_line?: WeeklyReportLine[];
  entries: number;
  contacted: number;
  quoted: number;
  won: number;
  /** CLP, integer. */
  won_amount: number;
  lost: number;
  /** lost_reasons.name, null for a lost lead without reason. */
  lost_by_reason: { reason: string | null; count: number }[];
  unattended: number;
  overdue_followups: number;
};

export type WeeklyReportOptions = {
  crmBaseUrl: string;
  /** The week_start passed to the RPC (YYYY-MM-DD, a Santiago calendar day). */
  weekStart: string;
};

export type WeeklyReport = { subject: string; html: string; text: string };

const WEEK_DAYS = 7;
const NO_REASON = "Sin motivo";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Chilean thousands separator, no Intl grouping quirks (es keeps "1234"). */
export const formatNumber = (value: number) =>
  String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatClp = (value: number) => `$${formatNumber(value)}`;

// week_start is already a day in America/Santiago: formatting it in UTC keeps
// that same calendar day (formatting in Santiago would shift it back one day).
const dayFormat = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const formatWeek = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`invalid weekStart: ${weekStart}`);
  }
  const end = new Date(start.getTime() + (WEEK_DAYS - 1) * 86_400_000);
  return `${dayFormat.format(start)} al ${dayFormat.format(end)}`;
};

const hasActivity = (d: WeeklyReportData) =>
  d.entries + d.contacted + d.quoted + d.won + d.lost > 0;

const summaryRows = (d: WeeklyReportData): [string, string][] => [
  ["Entradas", formatNumber(d.entries)],
  ["Contactados", formatNumber(d.contacted)],
  ["Cotizados", formatNumber(d.quoted)],
  ["Ganados", `${formatNumber(d.won)} (${formatClp(d.won_amount)})`],
  ["Perdidos", formatNumber(d.lost)],
];

const reasonRows = (d: WeeklyReportData): [string, string][] =>
  d.lost_by_reason.map((r) => [r.reason ?? NO_REASON, formatNumber(r.count)]);

const LINE_LABELS: Record<string, string> = {
  valvulas: "Válvulas",
  tuberias: "Tuberías",
  geoceldas: "Geoceldas",
  indeterminada: "Sin línea",
};

const LINE_HEAD = [
  "Línea",
  "Entradas",
  "Contactados",
  "Cotizados",
  "Ganados",
  "Monto ganado",
  "Perdidos",
];

const lineRows = (lines: WeeklyReportLine[]): string[][] =>
  lines.map((l) => [
    LINE_LABELS[l.business_line] ?? l.business_line,
    formatNumber(l.entries),
    formatNumber(l.contacted),
    formatNumber(l.quoted),
    formatNumber(l.won),
    formatClp(l.won_amount),
    formatNumber(l.lost),
  ]);

const lineText = (row: string[]) =>
  `- ${row[0]}: ` +
  row
    .slice(1)
    .map((value, i) => `${LINE_HEAD[i + 1].toLowerCase()} ${value}`)
    .join(", ");

const CELL = "padding:6px 12px;border:1px solid #d0d5dd;text-align:left;";
const CELL_NUM = "padding:6px 12px;border:1px solid #d0d5dd;text-align:right;";
const TABLE = "border-collapse:collapse;margin:8px 0 16px 0;font-size:14px;";
const H2 = "font-size:16px;margin:20px 0 4px 0;color:#101828;";
const P = "margin:4px 0;font-size:14px;";

// First column is a label (left), the rest are figures (right).
const cell = (tag: "th" | "td", value: string, i: number, extra = "") =>
  `<${tag} style="${i === 0 ? CELL : CELL_NUM}${extra}">${escapeHtml(value)}</${tag}>`;

const htmlTable = (head: string[], rows: string[][]) =>
  `<table role="presentation" style="${TABLE}"><thead><tr>` +
  head.map((h, i) => cell("th", h, i, "background:#f2f4f7;")).join("") +
  `</tr></thead><tbody>` +
  rows
    .map((row) => `<tr>${row.map((v, i) => cell("td", v, i)).join("")}</tr>`)
    .join("") +
  `</tbody></table>`;

const textTable = (rows: [string, string][]) =>
  rows.map(([label, value]) => `- ${label}: ${value}`).join("\n");

export const renderWeeklyReport = (
  data: WeeklyReportData,
  { crmBaseUrl, weekStart }: WeeklyReportOptions,
): WeeklyReport => {
  const week = formatWeek(weekStart);
  const leadsUrl = `${crmBaseUrl.replace(/\/+$/, "")}/deals`;
  const active = hasActivity(data);
  const quiet = "Sin movimiento esta semana: no entraron ni se cerraron leads.";
  const pending =
    `Sin atender (más de 24 h sin contacto): ${formatNumber(data.unattended)}. ` +
    `Seguimientos vencidos: ${formatNumber(data.overdue_followups)}. ` +
    `Cifras a la fecha de envío.`;

  const lines =
    active && data.by_business_line ? lineRows(data.by_business_line) : [];

  const subject = `Reporte semanal TekFusion: semana del ${week}`;

  const htmlParts = [
    `<h1 style="font-size:20px;margin:0 0 8px 0;color:#101828;">${escapeHtml(subject)}</h1>`,
    active
      ? `<h2 style="${H2}">Resumen</h2>` +
        htmlTable(["Indicador", "Cantidad"], summaryRows(data))
      : `<p style="${P}">${escapeHtml(quiet)}</p>`,
    lines.length > 0
      ? `<h2 style="${H2}">Por línea de negocio</h2>` +
        htmlTable(LINE_HEAD, lines)
      : "",
    data.lost_by_reason.length > 0
      ? `<h2 style="${H2}">Perdidos por motivo</h2>` +
        htmlTable(["Motivo", "Leads"], reasonRows(data))
      : "",
    `<h2 style="${H2}">Pendientes</h2>`,
    `<p style="${P}">${escapeHtml(pending)}</p>`,
    `<p style="${P}"><a href="${escapeHtml(leadsUrl)}" style="color:#1d4ed8;">Ver leads en el CRM</a></p>`,
  ];
  const html =
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head>` +
    `<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#344054;">` +
    htmlParts.join("") +
    `</body></html>`;

  const textParts = [
    subject,
    "",
    active ? `Resumen\n${textTable(summaryRows(data))}` : quiet,
    lines.length > 0
      ? `\nPor línea de negocio\n${lines.map(lineText).join("\n")}`
      : "",
    data.lost_by_reason.length > 0
      ? `\nPerdidos por motivo\n${textTable(reasonRows(data))}`
      : "",
    `\nPendientes\n${pending}`,
    `Ver leads en el CRM: ${leadsUrl}`,
  ];
  const text = textParts.filter((part) => part !== "").join("\n");

  return { subject, html, text };
};
