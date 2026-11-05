import type { DataProvider } from "ra-core";

type WithLogExport = {
  logExport?: (
    resource: string,
    rowCount: number,
    filters: Record<string, unknown>,
  ) => Promise<void>;
};

/**
 * TekFusion (docs/08): every CSV export is recorded with its author, through
 * the data provider's logExport when it has one. Never blocks the download:
 * a failure only calls onError.
 */
export const logExport = (
  dataProvider: DataProvider,
  resource: string,
  rowCount: number,
  filters: Record<string, unknown>,
  onError: () => void,
): Promise<void> =>
  Promise.resolve()
    .then(() =>
      (dataProvider as DataProvider & WithLogExport).logExport?.(
        resource,
        rowCount,
        filters,
      ),
    )
    .catch(onError);
