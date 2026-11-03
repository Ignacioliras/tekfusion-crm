import { useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ImportRowIssue } from "./types";

type DataImportReportProps = {
  open: boolean;
  importCount: number;
  duplicateCount: number;
  errorCount: number;
  issues: ImportRowIssue[];
  onClose(): void;
};

/** Result of an import that reports its rows: counts, then each row left out. */
export const DataImportReport = ({
  open,
  importCount,
  duplicateCount,
  errorCount,
  issues,
  onClose,
}: DataImportReportProps) => {
  const translate = useTranslate();
  const sorted = [...issues].sort((a, b) => a.line - b.line);
  const counts = [
    { key: "created", value: importCount },
    { key: "duplicates", value: duplicateCount },
    { key: "errors", value: errorCount },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-6 p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader>
          <DialogTitle>{translate("crm.data_import.report.title")}</DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-3">
          {counts.map(({ key, value }) => (
            <div key={key} className="rounded-md border p-3">
              <dt className="text-muted-foreground text-sm">
                {translate(`crm.data_import.report.${key}`)}
              </dt>
              <dd className="text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {sorted.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {translate("crm.data_import.report.line")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {translate("crm.data_import.report.kind")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {translate("crm.data_import.report.reason")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((issue) => (
                  <tr key={issue.line} className="border-t">
                    <td className="px-3 py-2 tabular-nums">{issue.line}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          issue.kind === "error" ? "destructive" : "outline"
                        }
                      >
                        {translate(
                          `crm.data_import.report.kinds.${issue.kind}`,
                        )}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {translate(issue.reason, issue.args)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>
            {translate("crm.data_import.report.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
