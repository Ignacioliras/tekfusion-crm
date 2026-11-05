import * as React from "react";
import { useCallback } from "react";
import { Download } from "lucide-react";
import type { Exporter } from "ra-core";
import {
  fetchRelatedRecords,
  useCanAccess,
  useDataProvider,
  useGetResourceLabel,
  useNotify,
  useListContext,
  useResourceTranslation,
} from "ra-core";
import { Button } from "@/components/ui/button";
import { logExport } from "@/components/admin/log-export";

/**
 * A button that exports list data to a file.
 *
 * Respects current filters and sort order, with configurable maximum results.
 * Use a custom exporter to customize the result and fetch related records.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/exportbutton/ ExportButton documentation}
 *
 * @example
 * import { CreateButton, ExportButton, TopToolbar } from '@/components/admin';
 *
 * const PostListActions = () => (
 *   <>
 *     <FilterButton />
 *     <CreateButton />
 *     <ExportButton />
 *   </>
 * );
 *
 * export const PostList = () => (
 *   <List actions={<PostListActions />}>
 *     ...
 *   </List>
 * );
 */
export const ExportButton = (props: ExportButtonProps) => {
  const {
    maxResults = 1000,
    onClick,
    label: labelProp,
    icon = defaultIcon,
    exporter: customExporter,
    meta,
    className = "cursor-pointer",
  } = props;
  const {
    getData,
    total,
    resource,
    filterValues,
    exporter: exporterFromContext,
  } = useListContext();
  const getResourceLabel = useGetResourceLabel();
  const label = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.action.export`,
    baseI18nKey: "ra.action.export",
    options: {
      name: getResourceLabel(resource, 1),
    },
    userText: labelProp,
  });
  const exporter = customExporter || exporterFromContext;
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!getData) {
        throw new Error(
          "ListContext.getData must be defined to use ExportButton.",
        );
      }

      getData({ maxResults, meta })
        .then((data) => {
          if (exporter) {
            exporter(
              data,
              fetchRelatedRecords(dataProvider),
              dataProvider,
              resource,
            );
          }
          return logExport(
            dataProvider,
            resource,
            data.length,
            filterValues ?? {},
            () => notify("tekfusion.export.log_error", { type: "warning" }),
          );
        })
        .catch((error) => {
          console.error(error);
          notify("HTTP Error", { type: "error" });
        });
      if (typeof onClick === "function") {
        onClick(event);
      }
    },
    [
      dataProvider,
      exporter,
      filterValues,
      getData,
      notify,
      onClick,
      resource,
      maxResults,
      meta,
    ],
  );

  // Exporting takes data out of the CRM: hidden unless canAccess allows it (docs/08).
  const { canAccess } = useCanAccess({ resource, action: "export" });
  if (!canAccess) return null;

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={total === 0}
      className={className}
    >
      {icon}
      {label}
    </Button>
  );
};

const defaultIcon = <Download />;

export interface ExportButtonProps {
  className?: string;
  exporter?: Exporter;
  icon?: React.ReactNode;
  label?: string;
  maxResults?: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  resource?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
}
