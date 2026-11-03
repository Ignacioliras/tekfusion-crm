import { normalizeEmail, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("reads the usual Chilean spellings of one mobile as the same E.164 number", () => {
    for (const raw of [
      "+56 9 1111 0001",
      "56911110001",
      "9 1111 0001",
      "(+56) 9-1111-0001",
      "0911110001",
    ]) {
      expect(normalizePhone(raw)).toBe("+56911110001");
    }
  });

  it("keeps a foreign number written with its plus sign", () => {
    expect(normalizePhone("+1 (415) 555-0100")).toBe("+14155550100");
  });

  it("rejects what cannot be a phone number", () => {
    expect(normalizePhone("123")).toBeUndefined();
    expect(normalizePhone("")).toBeUndefined();
    expect(normalizePhone(null)).toBeUndefined();
  });
});

describe("normalizeEmail", () => {
  it("lower-cases and trims, and rejects malformed addresses", () => {
    expect(normalizeEmail("  Ana.Perez@Minera.CL ")).toBe(
      "ana.perez@minera.cl",
    );
    expect(normalizeEmail("ana.perez@")).toBeUndefined();
  });
});
