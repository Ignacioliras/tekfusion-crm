import { QUOTE_MAX_BYTES, quotePdfPath, validateQuoteFile } from "./quoteFile";

const fileOf = (type: string, size: number) =>
  new File([new Uint8Array(size)], "Cotización final.pdf", { type });

describe("validateQuoteFile", () => {
  it("accepts a PDF up to 15 MB", () => {
    expect(validateQuoteFile(fileOf("application/pdf", 1024))).toBeNull();
  });

  it("rejects a file that is not a PDF", () => {
    expect(validateQuoteFile(fileOf("image/png", 1024))).toBe("type");
  });

  it("rejects a PDF over 15 MB", () => {
    expect(
      validateQuoteFile(fileOf("application/pdf", QUOTE_MAX_BYTES + 1)),
    ).toBe("size");
  });
});

describe("quotePdfPath", () => {
  it("stores the PDF under the lead folder with a regenerated name", () => {
    expect(quotePdfPath(42)).toMatch(
      /^deals\/42\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/,
    );
  });
});
