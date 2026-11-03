// @vitest-environment node
import { describe, expect, it } from "vitest";
import { roleUpdate } from "./role";

describe("roleUpdate", () => {
  it("writes the role when a valid one is sent, ignoring administrator", () => {
    expect(roleUpdate("reader", true)).toEqual({ role: "reader" });
  });

  it("falls back to administrator when no role is sent", () => {
    expect(roleUpdate(undefined, false)).toEqual({ administrator: false });
  });

  it("rejects an unknown role instead of writing it", () => {
    expect(roleUpdate("superadmin", undefined)).toBeNull();
    expect(roleUpdate("superadmin", true)).toEqual({ administrator: true });
  });
});
