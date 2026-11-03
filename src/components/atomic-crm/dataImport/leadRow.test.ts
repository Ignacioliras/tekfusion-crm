import { parseLeadRow, type LeadRowLookups } from "./leadRow";

const lookups: LeadRowLookups = {
  dealStages: [
    { value: "nuevo", label: "Nuevo" },
    { value: "cotizado", label: "Cotizado" },
  ],
  dealCategories: [],
  salesByEmail: new Map([["camila@demo.cl", 2]]),
  lineOwners: new Map([["valvulas", 2]]),
};

const reasonOf = (row: Record<string, string | null>) => {
  const result = parseLeadRow({ name: "Lead", ...row }, lookups);
  return "error" in result ? result.error.reason.split(".").pop() : "ok";
};

describe("parseLeadRow", () => {
  it("rejects each value it cannot understand, naming the reason", () => {
    expect(reasonOf({ name: " " })).toBe("missing_name");
    expect(reasonOf({ email: "ana@" })).toBe("invalid_email");
    expect(reasonOf({ phone: "12" })).toBe("invalid_phone");
    expect(reasonOf({ stage: "En espera" })).toBe("unknown_stage");
    expect(reasonOf({ business_line: "Bombas" })).toBe("unknown_business_line");
    expect(reasonOf({ sales_email: "nadie@demo.cl" })).toBe("unknown_sales");
  });

  it("falls back on empty cells: first stage, unclassified line, unassigned", () => {
    const result = parseLeadRow({ name: "Lead" }, lookups);
    expect(result).toMatchObject({
      draft: { stage: "nuevo", businessLine: "indeterminada", salesId: null },
    });
  });

  it("accepts labels and values, and assigns the line owner when no executive is named", () => {
    const result = parseLeadRow(
      {
        name: "Lead",
        business_line: "Válvulas",
        stage: "cotizado",
        email: " Ana@Minera.CL ",
      },
      lookups,
    );
    expect(result).toMatchObject({
      draft: {
        businessLine: "valvulas",
        stage: "cotizado",
        salesId: 2,
        email: "ana@minera.cl",
      },
    });
  });
});
