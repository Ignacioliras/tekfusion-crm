import { describe, it, expect } from "vitest";
import type { RaRecord } from "ra-core";
import { validateItemsInUse } from "./SettingsPage";

describe("validateItemsInUse", () => {
  const deals: RaRecord[] = [
    { id: 1, stage: "ganado", categories: ["ui-design"] },
    { id: 2, stage: "perdido", categories: ["copywriting", "ui-design"] },
    { id: 3, stage: "nuevo", categories: ["ui-design"] },
  ];

  it("returns undefined when items is undefined", () => {
    expect(validateItemsInUse(undefined, deals, "stage", "stages")).toBe(
      undefined,
    );
  });

  it("returns undefined when all in-use values are present", () => {
    const items = [
      { value: "ganado", label: "Ganado" },
      { value: "perdido", label: "Perdido" },
      { value: "nuevo", label: "Nuevo" },
    ];
    expect(validateItemsInUse(items, deals, "stage", "stages")).toBe(undefined);
  });

  it("returns an error when an in-use value is removed", () => {
    const items = [
      { value: "ganado", label: "Ganado" },
      { value: "nuevo", label: "Nuevo" },
    ];
    expect(validateItemsInUse(items, deals, "stage", "stages")).toBe(
      "Cannot remove stages that are still used by deals: perdido",
    );
  });

  it("lists all missing in-use values", () => {
    const items = [{ value: "nuevo", label: "Nuevo" }];
    const result = validateItemsInUse(items, deals, "stage", "stages");
    expect(result).toContain("ganado");
    expect(result).toContain("perdido");
  });

  it("returns an error when there are duplicate slugs", () => {
    const items = [
      { value: "ganado", label: "Ganado" },
      { value: "ganado", label: "Ganado otra vez" },
      { value: "perdido", label: "Perdido" },
      { value: "nuevo", label: "Nuevo" },
    ];
    expect(validateItemsInUse(items, deals, "stage", "stages")).toBe(
      "Duplicate stages: ganado",
    );
  });

  it("detects duplicates via slug fallback when value is empty", () => {
    const items = [
      { value: "", label: "Ganado" },
      { value: "ganado", label: "Ya ganado" },
      { value: "perdido", label: "Perdido" },
      { value: "nuevo", label: "Nuevo" },
    ];
    expect(validateItemsInUse(items, deals, "stage", "stages")).toBe(
      "Duplicate stages: ganado",
    );
  });

  it("returns 'Validating…' when deals have not loaded yet", () => {
    const items = [{ value: "ganado", label: "Ganado" }];
    expect(validateItemsInUse(items, undefined, "stage", "stages")).toBe(
      "Validating…",
    );
  });

  it("ignores deals with a falsy value for the checked field", () => {
    const dealsWithEmpty: RaRecord[] = [
      { id: 1, stage: "ganado", categories: [] },
      { id: 2, stage: "ganado", categories: null },
    ];
    const items = [{ value: "other", label: "Other" }];
    expect(
      validateItemsInUse(items, dealsWithEmpty, "categories", "categories"),
    ).toBe(undefined);
  });

  it("works with the categories array field", () => {
    const items = [{ value: "ui-design", label: "UI Design" }];
    expect(
      validateItemsInUse(items, deals, "categories", "categories"),
    ).toContain("copywriting");
  });
});
