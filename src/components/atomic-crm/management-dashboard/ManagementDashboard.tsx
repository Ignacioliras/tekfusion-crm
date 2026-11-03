import { useGetList, useTranslate } from "ra-core";
import { useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CANALES_ORIGEN, labelOf } from "../tekfusion/canales";
import { ETAPAS } from "../tekfusion/estados";
import { LINEAS_NEGOCIO } from "../tekfusion/lineas";
import { formatAmount } from "../tekfusion/money";
import type { DashboardMonthlyRow } from "../types";
import {
  avgFirstResponseHours,
  closeRate,
  currentMonth,
  formatHours,
  formatPercent,
  funnel,
  inRange,
  previousRange,
  sumRows,
  totalsBy,
  within24hRate,
  type Totals,
} from "./metrics";

const CURRENCY = "CLP";
// ponytail: one page of rows; the view has at most 24 rows per month (4 lines × 6 channels).
const MAX_ROWS = 1000;

const monthLabel = (month: string): string =>
  new Intl.DateTimeFormat("es-CL", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month.slice(0, 7)}-01T00:00:00Z`));

/**
 * Commercial metrics over the dashboard_monthly view (RF-11). The view applies
 * the RLS: an executive sees their own leads, managers and readers see all.
 */
export const ManagementDashboard = () => {
  const translate = useTranslate();
  const [range, setRange] = useState(() => {
    const month = currentMonth();
    return { from: month, to: month };
  });
  const from = range.from <= range.to ? range.from : range.to;
  const to = range.from <= range.to ? range.to : range.from;
  const previous = previousRange(from, to);

  const { data = [], isPending } = useGetList<DashboardMonthlyRow>(
    "dashboard_monthly",
    {
      pagination: { page: 1, perPage: MAX_ROWS },
      sort: { field: "month", order: "ASC" },
      filter: { "month@gte": `${previous.from}-01`, "month@lte": `${to}-01` },
    },
  );

  const currentRows = data.filter((row) => inRange(row, from, to));
  const previousRows = data.filter((row) =>
    inRange(row, previous.from, previous.to),
  );
  const current = sumRows(currentRows);
  const before = sumRows(previousRows);

  const setMonth = (key: "from" | "to") => (value: string) => {
    if (value) setRange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-end justify-between gap-4">
        <CardTitle>{translate("tekfusion.dashboard.title")}</CardTitle>
        <div className="flex gap-3">
          <MonthInput
            id="management-dashboard-from"
            label={translate("tekfusion.dashboard.from")}
            value={range.from}
            onChange={setMonth("from")}
          />
          <MonthInput
            id="management-dashboard-to"
            label={translate("tekfusion.dashboard.to")}
            value={range.to}
            onChange={setMonth("to")}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? null : currentRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translate("tekfusion.dashboard.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <Kpis current={current} before={before} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComparisonTable
                title={translate("tekfusion.dashboard.by_channel")}
                label={translate("tekfusion.dashboard.channel")}
                items={CANALES_ORIGEN}
                current={totalsBy(currentRows, "origin_channel")}
                before={totalsBy(previousRows, "origin_channel")}
              />
              <ComparisonTable
                title={translate("tekfusion.dashboard.by_line")}
                label={translate("tekfusion.dashboard.line")}
                items={LINEAS_NEGOCIO}
                current={totalsBy(currentRows, "business_line")}
                before={totalsBy(previousRows, "business_line")}
              />
              <Funnel totals={current} />
              <CloseRateTable
                title={translate("tekfusion.dashboard.close_rate_by_month")}
                label={translate("tekfusion.dashboard.month")}
                groups={totalsBy(data, "month")}
                labelFor={monthLabel}
              />
              <CloseRateTable
                title={translate("tekfusion.dashboard.close_rate_by_line")}
                label={translate("tekfusion.dashboard.line")}
                groups={totalsBy(currentRows, "business_line")}
                labelFor={(value) => labelOf(LINEAS_NEGOCIO, value)}
              />
              <CloseRateTable
                title={translate("tekfusion.dashboard.close_rate_by_channel")}
                label={translate("tekfusion.dashboard.channel")}
                groups={totalsBy(currentRows, "origin_channel")}
                labelFor={(value) => labelOf(CANALES_ORIGEN, value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MonthInput = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="month"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const Kpis = ({ current, before }: { current: Totals; before: Totals }) => {
  const translate = useTranslate();
  const kpis: Array<{ key: string; value: string; previous: string }> = [
    {
      key: "leads",
      value: String(current.leads),
      previous: String(before.leads),
    },
    {
      key: "avg_first_response",
      value: formatHours(avgFirstResponseHours(current)),
      previous: formatHours(avgFirstResponseHours(before)),
    },
    {
      key: "within_24h",
      value: formatPercent(within24hRate(current)),
      previous: formatPercent(within24hRate(before)),
    },
    {
      key: "close_rate",
      value: formatPercent(closeRate(current)),
      previous: formatPercent(closeRate(before)),
    },
    {
      key: "quoted_amount",
      value: formatAmount(current.quotedAmount, CURRENCY),
      previous: formatAmount(before.quotedAmount, CURRENCY),
    },
    {
      key: "won_amount",
      value: formatAmount(current.wonAmount, CURRENCY),
      previous: formatAmount(before.wonAmount, CURRENCY),
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {kpis.map((kpi) => {
        const title = translate(`tekfusion.dashboard.${kpi.key}`);
        return (
          <div
            key={kpi.key}
            role="group"
            aria-label={title}
            className="rounded-md border p-3"
          >
            <div className="text-muted-foreground text-xs">{title}</div>
            <div className="text-2xl font-semibold">{kpi.value}</div>
            <div className="text-muted-foreground text-xs">
              {translate("tekfusion.dashboard.previous", {
                value: kpi.previous,
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section aria-label={title} className="flex flex-col gap-2">
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

const ComparisonTable = ({
  title,
  label,
  items,
  current,
  before,
}: {
  title: string;
  label: string;
  items: ReadonlyArray<{ value: string; label: string }>;
  current: Map<string, Totals>;
  before: Map<string, Totals>;
}) => {
  const translate = useTranslate();
  const visible = items.filter(
    (item) => current.has(item.value) || before.has(item.value),
  );
  return (
    <Section title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right">
              {translate("tekfusion.dashboard.current_period")}
            </TableHead>
            <TableHead className="text-right">
              {translate("tekfusion.dashboard.previous_period")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => (
            <TableRow key={item.value}>
              <TableCell>{item.label}</TableCell>
              <TableCell className="text-right">
                {current.get(item.value)?.leads ?? 0}
              </TableCell>
              <TableCell className="text-right">
                {before.get(item.value)?.leads ?? 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
};

const Funnel = ({ totals }: { totals: Totals }) => {
  const translate = useTranslate();
  return (
    <Section title={translate("tekfusion.dashboard.funnel")}>
      <ol className="flex flex-col gap-2">
        {funnel(totals).map(({ stage, value }) => (
          <li key={stage} className="flex items-center gap-3 text-sm">
            <span className="w-24">{labelOf(ETAPAS, stage)}</span>
            <span
              className="bg-primary h-3 rounded-sm"
              style={{
                width: `${totals.leads ? (value / totals.leads) * 100 : 0}%`,
              }}
            />
            <span>{value}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
};

const CloseRateTable = ({
  title,
  label,
  groups,
  labelFor,
}: {
  title: string;
  label: string;
  groups: Map<string, Totals>;
  labelFor: (value: string) => string;
}) => {
  const translate = useTranslate();
  return (
    <Section title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            <TableHead className="text-right">
              {translate("tekfusion.dashboard.won_lost")}
            </TableHead>
            <TableHead className="text-right">
              {translate("tekfusion.dashboard.close_rate")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...groups.entries()].map(([value, totals]) => (
            <TableRow key={value}>
              <TableCell>{labelFor(value)}</TableCell>
              <TableCell className="text-right">
                {totals.won} / {totals.lost}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(closeRate(totals))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
};
