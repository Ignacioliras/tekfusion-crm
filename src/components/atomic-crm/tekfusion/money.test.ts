import { formatAmount } from "./money";

describe("formatAmount", () => {
  it("formats CLP with dots as thousands separator and no decimals", () => {
    expect(formatAmount(8719000, "CLP")).toBe("$8.719.000");
  });

  it("rounds fractional amounts instead of showing decimals", () => {
    expect(formatAmount(1234.6, "CLP")).toBe("$1.235");
  });

  it("shows $0 when the amount is missing", () => {
    expect(formatAmount(null, "CLP")).toBe("$0");
    expect(formatAmount(undefined, "CLP")).toBe("$0");
  });

  it("abbreviates millions in compact mode for chart axes", () => {
    // Intl separates the unit with a non-breaking space.
    expect(formatAmount(400000000, "CLP", { compact: true })).toMatch(
      /^\$400\sM$/,
    );
    expect(formatAmount(8719000, "CLP", { compact: true })).toMatch(
      /^\$8,7\sM$/,
    );
  });

  it("keeps the Chilean number format for another configured currency", () => {
    expect(formatAmount(1500, "USD")).toBe("$1.500");
  });
});
