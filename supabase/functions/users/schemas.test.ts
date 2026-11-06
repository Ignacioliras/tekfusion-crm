// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  inviteUserSchema,
  offboardUserSchema,
  patchUserSchema,
} from "./schemas";

const failedField = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}) => result.error?.issues[0].path.join(".");

describe("inviteUserSchema (POST)", () => {
  // What SalesCreate sends after withRole.
  const valid = {
    email: "nueva.ejecutiva@ejemplo.cl",
    first_name: "Camila",
    last_name: "Rojas",
    role: "executive",
    administrator: false,
  };

  it("accepts the body of the create form and of the JSON import", () => {
    expect(inviteUserSchema.safeParse(valid).success).toBe(true);
    expect(
      inviteUserSchema.safeParse({
        email: "importado@ejemplo.cl",
        first_name: "Pedro",
        last_name: "Soto",
        administrator: false,
        disabled: false,
      }).success,
    ).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = inviteUserSchema.safeParse({
      ...valid,
      email: "no-es-correo",
    });
    expect(failedField(result)).toBe("email");
  });

  it("rejects a missing email", () => {
    const { email: _, ...withoutEmail } = valid;
    expect(failedField(inviteUserSchema.safeParse(withoutEmail))).toBe("email");
  });

  it("rejects an unknown role", () => {
    const result = inviteUserSchema.safeParse({ ...valid, role: "superadmin" });
    expect(failedField(result)).toBe("role");
  });

  it("rejects administrator sent as a string", () => {
    const result = inviteUserSchema.safeParse({
      ...valid,
      administrator: "true",
    });
    expect(failedField(result)).toBe("administrator");
  });

  it("rejects fields the function does not take", () => {
    expect(inviteUserSchema.safeParse({ ...valid, user_id: "x" }).success).toBe(
      false,
    );
  });
});

describe("patchUserSchema (PATCH)", () => {
  // What salesUpdate builds from the edit form.
  const valid = {
    sales_id: 3,
    email: "camila.rojas@ejemplo.cl",
    secondary_emails: ["camila@personal.cl"],
    first_name: "Camila",
    last_name: "Rojas",
    administrator: false,
    role: "reader",
    disabled: false,
    avatar: {
      src: "data:image/png;base64,AAAA",
      title: "foto.png",
      rawFile: {},
    },
  };

  it("accepts the edit form body, and a removed avatar as null", () => {
    expect(patchUserSchema.safeParse(valid).success).toBe(true);
    expect(patchUserSchema.safeParse({ ...valid, avatar: null }).success).toBe(
      true,
    );
  });

  it("accepts a body with only sales_id and administrator (old clients)", () => {
    expect(
      patchUserSchema.safeParse({ sales_id: 3, administrator: true }).success,
    ).toBe(true);
  });

  it("requires sales_id as a positive integer", () => {
    expect(failedField(patchUserSchema.safeParse({ first_name: "A" }))).toBe(
      "sales_id",
    );
    for (const sales_id of ["3", 0, -1, 1.5]) {
      expect(
        failedField(patchUserSchema.safeParse({ ...valid, sales_id })),
      ).toBe("sales_id");
    }
  });

  it("rejects secondary_emails that is not an array of strings", () => {
    const result = patchUserSchema.safeParse({
      ...valid,
      secondary_emails: "camila@personal.cl",
    });
    expect(failedField(result)).toBe("secondary_emails");
  });

  it("rejects a malformed email and an unknown role", () => {
    expect(
      failedField(patchUserSchema.safeParse({ ...valid, email: "camila" })),
    ).toBe("email");
    expect(
      failedField(patchUserSchema.safeParse({ ...valid, role: "admin" })),
    ).toBe("role");
  });

  it("rejects fields the function does not take", () => {
    expect(
      patchUserSchema.safeParse({ ...valid, user_id: "otro" }).success,
    ).toBe(false);
  });
});

describe("offboardUserSchema (DELETE)", () => {
  it("accepts a sales_id", () => {
    expect(offboardUserSchema.safeParse({ sales_id: 7 }).success).toBe(true);
  });

  it("rejects a missing, non-integer or extra field", () => {
    expect(offboardUserSchema.safeParse({}).success).toBe(false);
    expect(offboardUserSchema.safeParse({ sales_id: "7" }).success).toBe(false);
    expect(
      offboardUserSchema.safeParse({ sales_id: 7, substitute_id: 2 }).success,
    ).toBe(false);
  });
});
