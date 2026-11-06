import { useQuery } from "@tanstack/react-query";
import type { Identifier } from "ra-core";
import { useCanAccess, useDataProvider, useTranslate } from "ra-core";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CrmDataProvider } from "../providers/types";
import { useGetSalesName } from "../sales/useGetSalesName";
import { formatAmount } from "../tekfusion/money";
import { formatHours, rankSales, type DayRange } from "./metrics";

const CURRENCY = "CLP";

interface SalesRankingProps {
  /** Same range as the metrics above. */
  range: DayRange;
}

/**
 * Executive ranking over sales_ranking_summary (RF-11), managers only. Same
 * criterion as LeadActions: only managers may list sales (canAccess.ts).
 * Executives and readers render nothing and never query it.
 */
export const SalesRanking = ({ range }: SalesRankingProps) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { canAccess: isManager = false } = useCanAccess({
    resource: "sales",
    action: "list",
  });
  const { data = [], isPending } = useQuery({
    queryKey: ["sales_ranking_summary", range.from, range.to],
    queryFn: () => dataProvider.getSalesRankingSummary(range),
    enabled: isManager,
  });
  if (!isManager) return null;

  const title = translate("tekfusion.dashboard.ranking.title");
  const ranking = rankSales(data);
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
              <TableRow key={line.sales_id}>
                <TableCell>
                  <SalesName id={line.sales_id} />
                </TableCell>
                <TableCell className="text-right">
                  {line.leads_attended}
                </TableCell>
                <TableCell className="text-right">
                  {formatHours(line.avg_first_response_hours)}
                </TableCell>
                <TableCell className="text-right">{line.quotes_sent}</TableCell>
                <TableCell className="text-right">{line.won}</TableCell>
                <TableCell className="text-right">
                  {formatAmount(line.won_amount, CURRENCY)}
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
