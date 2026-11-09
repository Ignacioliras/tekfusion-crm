import { canAccess, getAccessRole } from "./canAccess";

describe("canAccess", () => {
  it("lets the reader role list and show, and nothing else", () => {
    for (const action of ["list", "show"]) {
      expect(canAccess("reader", { resource: "deals", action })).toBe(true);
    }
    for (const action of ["create", "edit", "delete", "export"]) {
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

it("lets an executive write only on their own lead when the record is given", () => {
  const own = { id: 1, sales_id: 7 };
  const other = { id: 2, sales_id: 8 };
  const unassigned = { id: 3, sales_id: null };
  for (const action of ["edit", "delete"]) {
    expect(
      canAccess("user", { resource: "deals", action, record: own }, 7),
    ).toBe(true);
    expect(
      canAccess("user", { resource: "deals", action, record: other }, 7),
    ).toBe(false);
    expect(
      canAccess("user", { resource: "deals", action, record: unassigned }, 7),
    ).toBe(false);
    expect(
      canAccess("admin", { resource: "deals", action, record: unassigned }, 7),
    ).toBe(true);
  }
  // Reading a lead, or the edit right without a record, does not change.
  expect(
    canAccess("user", { resource: "deals", action: "show", record: other }, 7),
  ).toBe(true);
  expect(canAccess("user", { resource: "deals", action: "edit" }, 7)).toBe(
    true,
  );
  // Unknown identity: no write on a given lead.
  expect(
    canAccess("user", { resource: "deals", action: "edit", record: own }),
  ).toBe(false);
});

it("lets only managers export, on every resource", () => {
  for (const resource of ["deals", "contacts", "companies"]) {
    expect(canAccess("admin", { resource, action: "export" })).toBe(true);
    expect(canAccess("user", { resource, action: "export" })).toBe(false);
    expect(canAccess("reader", { resource, action: "export" })).toBe(false);
  }
});

it("keeps the reader out of WhatsApp and the 'Todos' tab for managers", () => {
  for (const resource of ["wa_conversations", "wa_messages"]) {
    expect(canAccess("reader", { resource, action: "list" })).toBe(false);
    expect(canAccess("reader", { resource, action: "show" })).toBe(false);
    expect(canAccess("user", { resource, action: "list" })).toBe(true);
    expect(canAccess("admin", { resource, action: "list" })).toBe(true);
  }
  expect(
    canAccess("user", { resource: "wa_conversations", action: "list_all" }),
  ).toBe(false);
  expect(
    canAccess("admin", { resource: "wa_conversations", action: "list_all" }),
  ).toBe(true);
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
