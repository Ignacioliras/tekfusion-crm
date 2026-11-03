import { canAccess, getAccessRole } from "./canAccess";

describe("canAccess", () => {
  it("lets the reader role list, show and export, and nothing else", () => {
    for (const action of ["list", "show", "export"]) {
      expect(canAccess("reader", { resource: "deals", action })).toBe(true);
    }
    for (const action of ["create", "edit", "delete"]) {
      expect(canAccess("reader", { resource: "deals", action })).toBe(false);
      expect(canAccess("reader", { resource: "contacts", action })).toBe(false);
    }
  });

  it("keeps users and configuration for managers only", () => {
    expect(canAccess("reader", { resource: "sales", action: "list" })).toBe(
      false,
    );
    expect(canAccess("user", { resource: "sales", action: "list" })).toBe(
      false,
    );
    expect(canAccess("user", { resource: "deals", action: "edit" })).toBe(true);
    expect(canAccess("admin", { resource: "sales", action: "edit" })).toBe(
      true,
    );
  });
});

describe("getAccessRole", () => {
  it("maps TekFusion's role first and Atomic's administrator flag second", () => {
    expect(getAccessRole({ role: "reader", administrator: false })).toBe(
      "reader",
    );
    expect(getAccessRole({ role: "manager", administrator: true })).toBe(
      "admin",
    );
    expect(getAccessRole({ role: "executive", administrator: false })).toBe(
      "user",
    );
    expect(getAccessRole({ administrator: true })).toBe("admin");
  });
});
