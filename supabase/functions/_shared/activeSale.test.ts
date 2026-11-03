import { describe, expect, it } from "vitest";
import { isActiveSale, resolveDisabled } from "./activeSale";

describe("isActiveSale", () => {
  it("rejects a missing row and a disabled user, even with a valid token", () => {
    expect(isActiveSale(null)).toBe(false);
    expect(isActiveSale(undefined)).toBe(false);
    expect(isActiveSale({ disabled: true })).toBe(false);
  });

  it("accepts an active user", () => {
    expect(isActiveSale({ disabled: false })).toBe(true);
    expect(isActiveSale({})).toBe(true);
  });
});

describe("resolveDisabled", () => {
  it("keeps the stored ban when a user patches its own profile", () => {
    expect(resolveDisabled(true, undefined, false)).toBe(true);
    expect(resolveDisabled(true, false, false)).toBe(true);
  });

  it("keeps the stored ban when an administrator does not send the field", () => {
    expect(resolveDisabled(true, undefined, true)).toBe(true);
    expect(resolveDisabled(false, undefined, true)).toBe(false);
  });

  it("lets an administrator change the ban explicitly", () => {
    expect(resolveDisabled(true, false, true)).toBe(false);
    expect(resolveDisabled(false, true, true)).toBe(true);
  });
});
