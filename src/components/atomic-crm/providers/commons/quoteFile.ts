import type { Identifier } from "ra-core";

// Quote PDFs (docs/08): PDF only, 15 MB max, stored under a regenerated name in
// the private "quotes" bucket. The bucket enforces the same limits.
export const QUOTES_BUCKET = "quotes";
export const QUOTE_MAX_BYTES = 15 * 1024 * 1024;

export type QuoteFileError = "type" | "size";

export const validateQuoteFile = (file: File): QuoteFileError | null => {
  if (file.type !== "application/pdf") return "type";
  if (file.size > QUOTE_MAX_BYTES) return "size";
  return null;
};

export const quotePdfPath = (
  dealId: Identifier,
  uuid: string = crypto.randomUUID(),
): string => `deals/${dealId}/${uuid}.pdf`;
