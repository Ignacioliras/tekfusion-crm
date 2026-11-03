import type { SalesAbsence } from "../types";
import {
  getUserAssignmentValues,
  planUserAssignments,
  type BusinessLineRecord,
} from "./userAssignments";

const line = (
  code: BusinessLineRecord["code"],
  owner: number | null,
  substitute: number | null,
): BusinessLineRecord => ({
  id: code,
  code,
  name: code,
  owner_sales_id: owner,
  substitute_sales_id: substitute,
  keywords: [],
});

const lines = [
  line("valvulas", 2, 3),
  line("tuberias", 3, 2),
  line("geoceldas", 2, 3),
];
const absences: SalesAbsence[] = [
  {
    id: 10,
    sales_id: 2,
    starts_on: "2026-12-01",
    ends_on: "2026-12-05",
    reason: "Vacaciones",
  },
  {
    id: 11,
    sales_id: 3,
    starts_on: "2026-12-10",
    ends_on: "2026-12-12",
    reason: null,
  },
];

describe("getUserAssignmentValues", () => {
  it("reads the lines a user owns, their substitute and only their absences", () => {
    expect(getUserAssignmentValues(2, lines, absences)).toEqual({
      line_codes: ["valvulas", "geoceldas"],
      substitute_sales_id: 3,
      absences: [
        {
          id: 10,
          starts_on: "2026-12-01",
          ends_on: "2026-12-05",
          reason: "Vacaciones",
        },
      ],
    });
  });
});

describe("planUserAssignments", () => {
  it("plans nothing when the values are unchanged", () => {
    const values = getUserAssignmentValues(2, lines, absences);
    expect(planUserAssignments(2, values, lines, absences)).toEqual([]);
  });

  it("takes over a line, releases another and moves the substitute to every owned line", () => {
    const ops = planUserAssignments(
      2,
      {
        line_codes: ["valvulas", "tuberias"],
        substitute_sales_id: 4,
        absences: absences.slice(0, 1),
      },
      lines,
      absences,
    );
    expect(ops).toEqual([
      expect.objectContaining({
        resource: "business_lines",
        id: "valvulas",
        data: { owner_sales_id: 2, substitute_sales_id: 4 },
      }),
      expect.objectContaining({
        resource: "business_lines",
        id: "tuberias",
        data: { owner_sales_id: 2, substitute_sales_id: 4 },
      }),
      expect.objectContaining({
        resource: "business_lines",
        id: "geoceldas",
        data: { owner_sales_id: null },
      }),
    ]);
  });

  it("creates new absences, updates edited ones and deletes removed ones, never another user's", () => {
    const ops = planUserAssignments(
      3,
      {
        line_codes: ["tuberias"],
        substitute_sales_id: 2,
        absences: [
          { starts_on: "2027-01-02", ends_on: "2027-01-03", reason: "" },
        ],
      },
      lines,
      absences,
    );
    expect(ops).toEqual([
      {
        type: "delete",
        resource: "sales_absences",
        id: 11,
        previousData: absences[1],
      },
      {
        type: "create",
        resource: "sales_absences",
        data: {
          sales_id: 3,
          starts_on: "2027-01-02",
          ends_on: "2027-01-03",
          reason: null,
        },
      },
    ]);
  });

  it("updates an absence whose dates changed", () => {
    const ops = planUserAssignments(
      2,
      {
        line_codes: ["valvulas", "geoceldas"],
        substitute_sales_id: 3,
        absences: [
          {
            id: 10,
            starts_on: "2026-12-01",
            ends_on: "2026-12-09",
            reason: "Vacaciones",
          },
        ],
      },
      lines,
      absences,
    );
    expect(ops).toEqual([
      expect.objectContaining({
        type: "update",
        resource: "sales_absences",
        id: 10,
        data: {
          starts_on: "2026-12-01",
          ends_on: "2026-12-09",
          reason: "Vacaciones",
        },
      }),
    ]);
  });
});
