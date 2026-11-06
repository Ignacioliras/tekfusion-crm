import { useQuery } from "@tanstack/react-query";
import { useDataProvider, useTranslate } from "ra-core";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
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
import type { CrmDataProvider } from "../providers/types";
import {
  avgFirstResponseHours,
  closeRate,
  DEFAULT_PRESET,
  formatHours,
  formatPercent,
  funnel,
  PRESETS,
  presetRange,
  previousRange,
  sumRows,
  totalsBy,
  within24hRate,
  type DayRange,
  type Preset,
  type Totals,
} from "./metrics";
import { SalesRanking } from "./SalesRanking";

const CURRENCY = "CLP";
// ponytail: below this many leads the funnel scales to it, so 1 of 1 does not
// draw as a full bar; a real volume (dozens a month) scales to its own leads.
const FUNNEL_MIN_SCALE = 10;

const monthLabel = (month: string): string =>
  new Intl.DateTimeFormat("es-CL", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month.slice(0, 7)}-01T00:00:00Z`));

const dayLabel = (day: string): string =>
  new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));

const rangeLabel = ({ from, to }: DayRange): string =>
  `${dayLabel(from)} – ${dayLabel(to)}`;

/** One range summed in the database (RPC dashboard_summary). */
const useDashboardSummary = ({ from, to }: DayRange) => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  return useQuery({
    queryKey: ["dashboard_summary", from, to],
    queryFn: () => dataProvider.getDashboardSummary({ from, to }),
  });
};

/**
 * Commercial metrics over dashboard_summary (RF-11), for a date range against
 * the range of the same length right before it. The underlying view applies
 * the RLS: an executive sees their own leads, managers and readers see all.
 * Managers also get the executive ranking for the same range.
 */
export const ManagementDashboard = () => {
  const translate = useTranslate();
  const [preset, setPreset] = useState<Preset | null>(DEFAULT_PRESET);
  const [range, setRange] = useState<DayRange>(() =>
    presetRange(DEFAULT_PRESET),
  );
  const ordered: DayRange =
    range.from <= range.to ? range : { from: range.to, to: range.from };
  const previous = previousRange(ordered);

  const currentQuery = useDashboardSummary(ordered);
  const previousQuery = useDashboardSummary(previous);
  const isPending = currentQuery.isPending || previousQuery.isPending;
  const error = currentQuery.error ?? previousQuery.error;
  const currentRows = currentQuery.data ?? [];
  const previousRows = previousQuery.data ?? [];
  const current = sumRows(currentRows);
  const before = sumRows(previousRows);

  const choosePreset = (next: Preset) => {
    setPreset(next);
    setRange(presetRange(next));
  };
  const setDay = (key: keyof DayRange) => (value: string) => {
    if (!value) return;
    setPreset(null);
    setRange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <CardTitle>{translate("tekfusion.dashboard.title")}</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div
              role="group"
              aria-label={translate("tekfusion.dashboard.period")}
              className="flex flex-wrap gap-1"
            >
              {PRESETS.map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={preset === key ? "default" : "outline"}
                  aria-pressed={preset === key}
                  onClick={() => choosePreset(key)}
                >
                  {translate(`tekfusion.dashboard.presets.${key}`)}
                </Button>
              ))}
            </div>
            <DayInput
              id="management-dashboard-from"
              label={translate("tekfusion.dashboard.from")}
              value={range.from}
              onChange={setDay("from")}
            />
            <DayInput
              id="management-dashboard-to"
              label={translate("tekfusion.dashboard.to")}
              value={range.to}
              onChange={setDay("to")}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {translate("tekfusion.dashboard.compared_with", {
            range: rangeLabel(previous),
          })}
        </p>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {translate("ra.notification.http_error")}
          </p>
        ) : isPending ? null : currentRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {translate("tekfusion.dashboard.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <Kpis current={current} before={before} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                groups={totalsBy(currentRows, "month")}
                labelFor={monthLabel}
                previous={{
                  label: translate("tekfusion.dashboard.previous_row", {
                    range: rangeLabel(previous),
                  }),
                  totals: before,
                }}
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
            <SalesRanking range={ordered} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DayInput = ({
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
      type="date"
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
    // auto-rows-fr: every card as tall as the tallest one.
    <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const title = translate(`tekfusion.dashboard.${kpi.key}`);
        return (
          <div
            key={kpi.key}
            role="group"
            aria-label={title}
            className="flex flex-col justify-between gap-1 rounded-md border p-3"
          >
            <div className="text-muted-foreground text-xs">{title}</div>
            <div className="text-2xl font-semibold tabular-nums">
              {kpi.value}
            </div>
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
              <TableCell className="text-right tabular-nums">
                {current.get(item.value)?.leads ?? 0}
              </TableCell>
              <TableCell className="text-right tabular-nums">
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
  const scale = Math.max(totals.leads, FUNNEL_MIN_SCALE);
  return (
    <Section title={translate("tekfusion.dashboard.funnel")}>
      <ol className="flex flex-col gap-2">
        {funnel(totals).map(({ stage, value }) => (
          // Fixed columns (label, track, number): a zero keeps its place.
          <li
            key={stage}
            className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm"
          >
            <span>{labelOf(ETAPAS, stage)}</span>
            <span className="bg-muted h-3 rounded-sm">
              <span
                className="bg-primary block h-3 rounded-sm"
                style={{ width: `${(value / scale) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums">{value}</span>
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
  previous,
}: {
  title: string;
  label: string;
  groups: Map<string, Totals>;
  labelFor: (value: string) => string;
  /** A last row with the previous range, to compare with. */
  previous?: { label: string; totals: Totals };
}) => {
  const translate = useTranslate();
  const rows = [
    ...[...groups.entries()].map(([value, totals]) => ({
      key: value,
      label: labelFor(value),
      totals,
      isPrevious: false,
    })),
    ...(previous ? [{ key: "previous", ...previous, isPrevious: true }] : []),
  ];
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
          {rows.map((row) => (
            <TableRow
              key={row.key}
              className={row.isPrevious ? "text-muted-foreground" : undefined}
            >
              <TableCell>{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.totals.won} / {row.totals.lost}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(closeRate(row.totals))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
};
