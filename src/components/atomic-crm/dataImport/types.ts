import type { ImportableResourceName } from "./useImportableResources";

/**
 * A single parsed CSV cell. Papa Parse runs with `dynamicTyping`, so numeric and
 * boolean cells are already converted, an empty cell is null, and everything
 * else is a string.
 */
export type ImportCell = string | number | boolean | null;

/** One parsed CSV row, keyed by column header. */
export type ImportRow = Record<string, ImportCell>;

/** A CSV row left out of the import, and why (an i18n key and its arguments). */
export type ImportRowIssue = {
  /** Line of the CSV file, counting the header as line 1. */
  line: number;
  kind: "duplicate" | "error";
  reason: string;
  args?: Record<string, string | number>;
};

/** Where a batch sits in its import. */
export type ImportBatchContext = {
  /** CSV line of the batch's first row. */
  firstLine: number;
  /** True for the first batch: per-import caches start over. */
  isFirstBatch: boolean;
};

/**
 * What a batch reports when it can say more than a count: the rows it left
 * out, each with its reason. Rows neither created nor listed are errors.
 */
export type ImportBatchReport = { created: number; issues: ImportRowIssue[] };

/**
 * Creates the records of one batch of parsed CSV rows, and returns how many of
 * them were created (the rows the database refused are the batch's errors), or
 * a report that also names the duplicates and errors row by row.
 */
export type ProcessImportBatch = (
  batch: ImportRow[],
  context?: ImportBatchContext,
) => Promise<number | ImportBatchReport>;

/** A resource the import dialog can import a CSV file into. */
export type ImportableResource = {
  /** Resource name, as registered in the Admin (e.g. "companies") */
  name: ImportableResourceName;
  /** CSV content offered as a downloadable template for this resource */
  sampleCsv: string;
  /**
   * Columns Papa Parse must leave as text, because a leading zero carries
   * meaning there: a `02134` zipcode would otherwise be stored as `2134`.
   */
  textColumns?: string[];
  processBatch: ProcessImportBatch;
};
