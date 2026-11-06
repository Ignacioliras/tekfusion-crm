import { canEditDeal } from "./canEditDeal";

describe("canEditDeal", () => {
  it("lets a manager edit any lead, assigned or not", () => {
    expect(canEditDeal({ sales_id: 1 }, 0, true)).toBe(true);
    expect(canEditDeal({ sales_id: null }, 0, true)).toBe(true);
  });

  it("lets an executive edit only their own lead", () => {
    expect(canEditDeal({ sales_id: 0 }, 0, false)).toBe(true);
    expect(canEditDeal({ sales_id: 1 }, 0, false)).toBe(false);
  });

  it("refuses an unassigned lead to an executive", () => {
    expect(canEditDeal({ sales_id: null }, 0, false)).toBe(false);
    expect(canEditDeal({}, 0, false)).toBe(false);
  });

  it("refuses everything while the identity is not loaded", () => {
    expect(canEditDeal({}, undefined, false)).toBe(false);
    expect(canEditDeal({ sales_id: null }, null, false)).toBe(false);
  });
});
