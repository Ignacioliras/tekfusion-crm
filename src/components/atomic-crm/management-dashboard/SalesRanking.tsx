import type { Identifier } from "ra-core";
import { useCanAccess, useGetList, useTranslate } from "ra-core";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetSalesName } from "../sales/useGetSalesName";
import { formatAmount } from "../tekfusion/money";
import type { SalesRankingRow } from "../types";
import { formatHours, rankSales, type DayRange } from "./metrics";

const CURRENCY = "CLP";
// ponytail: one page of rows; one row per executive and day (a year ≈ 6 × 250).
const MAX_ROWS = 1000;

interface SalesRankingProps {
  /** Same range as the metrics above. */
  range: DayRange;
}

/**
 * Executive ranking over the sales_ranking view (RF-11), managers only. Same
 * criterion as LeadActions: only managers may list sales (canAccess.ts).
 * Executives and readers render nothing and never query the view.
 */
export const SalesRanking = ({ range }: SalesRankingProps) => {
  const translate = useTranslate();
  const { canAccess: isManager = false } = useCanAccess({
    resource: "sales",
    action: "list",
  });
  const { data = [], isPending } = useGetList<SalesRankingRow>(
    "sales_ranking",
    {
      pagination: { page: 1, perPage: MAX_ROWS },
      sort: { field: "day", order: "ASC" },
      filter: { "day@gte": range.from, "day@lte": range.to },
    },
    { enabled: isManager },
  );
  if (!isManager) return null;

  const title = translate("tekfusion.dashboard.ranking.title");
  const ranking = rankSales(data, range);
  const column = (key: string) =>
    translate(`tekfusion.dashboard.ranking.${key}`);

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {isPending ? null : ranking.length === 0 ? (
        <p className="text-muted-foreground text-sm">{column("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{column("sales")}</TableHead>
              <TableHead className="text-right">
                {column("leads_attended")}
              </TableHead>
              <TableHead className="text-right">
                {column("avg_first_response")}
              </TableHead>
              <TableHead className="text-right">
                {column("quotes_sent")}
              </TableHead>
              <TableHead className="text-right">{column("won")}</TableHead>
              <TableHead className="text-right">
                {column("won_amount")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((line) => (
              <TableRow key={line.salesId}>
                <TableCell>
                  <SalesName id={line.salesId} />
                </TableCell>
                <TableCell className="text-right">
                  {line.leadsAttended}
                </TableCell>
                <TableCell className="text-right">
                  {formatHours(line.avgFirstResponseHours)}
                </TableCell>
                <TableCell className="text-right">{line.quotesSent}</TableCell>
                <TableCell className="text-right">{line.won}</TableCell>
                <TableCell className="text-right">
                  {formatAmount(line.wonAmount, CURRENCY)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
};

const SalesName = ({ id }: { id: Identifier }) => <>{useGetSalesName(id)}</>;
