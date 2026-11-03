import type { DataProvider, Identifier } from "ra-core";

import type { BusinessLineConfig, SalesAbsence } from "../types";

// A user's business lines, substitute and absences, as edited in
// Configuración → Usuarios. The substitute lives on business_lines (one per
// line, docs/05): editing it here sets it on every line the user owns.

export type BusinessLineRecord = BusinessLineConfig & { id: Identifier };

export type AbsenceFormValue = {
  id?: Identifier;
  starts_on: string;
  ends_on: string;
  reason?: string | null;
};

export type UserAssignmentValues = {
  line_codes: BusinessLineConfig["code"][];
  substitute_sales_id: Identifier | null;
  absences: AbsenceFormValue[];
};

type Operation =
  | {
      type: "update";
      resource: "business_lines" | "sales_absences";
      id: Identifier;
      data: Record<string, unknown>;
      previousData: Record<string, unknown>;
    }
  | {
      type: "create";
      resource: "sales_absences";
      data: Record<string, unknown>;
    }
  | {
      type: "delete";
      resource: "sales_absences";
      id: Identifier;
      previousData: SalesAbsence;
    };

const sameId = (
  a: Identifier | null | undefined,
  b: Identifier | null | undefined,
) => a != null && b != null && String(a) === String(b);

const sameOptionalId = (
  a: Identifier | null | undefined,
  b: Identifier | null | undefined,
) => String(a ?? "") === String(b ?? "");

/** Form values for a user, read from the stored lines and absences. */
export const getUserAssignmentValues = (
  saleId: Identifier,
  lines: BusinessLineRecord[],
  absences: SalesAbsence[],
): UserAssignmentValues => {
  const owned = lines.filter((line) => sameId(line.owner_sales_id, saleId));
  return {
    line_codes: owned.map((line) => line.code),
    substitute_sales_id: owned[0]?.substitute_sales_id ?? null,
    absences: absences
      .filter((absence) => sameId(absence.sales_id, saleId))
      .map(({ id, starts_on, ends_on, reason }) => ({
        id,
        starts_on,
        ends_on,
        reason: reason ?? null,
      })),
  };
};

/** The writes needed to go from the stored state to the submitted values. */
export const planUserAssignments = (
  saleId: Identifier,
  values: UserAssignmentValues,
  lines: BusinessLineRecord[],
  absences: SalesAbsence[],
): Operation[] => {
  const substitute = values.substitute_sales_id ?? null;

  const lineOps = lines.flatMap((line): Operation[] => {
    const wanted = values.line_codes.includes(line.code);
    const owns = sameId(line.owner_sales_id, saleId);
    if (
      wanted &&
      !(owns && sameOptionalId(line.substitute_sales_id, substitute))
    ) {
      const data = { owner_sales_id: saleId, substitute_sales_id: substitute };
      return [update("business_lines", line, data)];
    }
    if (!wanted && owns) {
      return [update("business_lines", line, { owner_sales_id: null })];
    }
    return [];
  });

  const stored = absences.filter((absence) => sameId(absence.sales_id, saleId));
  const submittedIds = values.absences
    .map((absence) => absence.id)
    .filter((id) => id != null);

  const deleteOps = stored
    .filter((absence) => !submittedIds.some((id) => sameId(id, absence.id)))
    .map((absence): Operation => ({
      type: "delete",
      resource: "sales_absences",
      id: absence.id,
      previousData: absence,
    }));

  const upsertOps = values.absences.flatMap((absence): Operation[] => {
    const data = {
      starts_on: absence.starts_on,
      ends_on: absence.ends_on,
      reason: absence.reason || null,
    };
    const previous = stored.find((item) => sameId(item.id, absence.id));
    if (!previous) {
      return [
        {
          type: "create",
          resource: "sales_absences",
          data: { ...data, sales_id: saleId },
        },
      ];
    }
    const changed =
      previous.starts_on !== data.starts_on ||
      previous.ends_on !== data.ends_on ||
      (previous.reason ?? null) !== data.reason;
    return changed ? [update("sales_absences", previous, data)] : [];
  });

  return [...lineOps, ...deleteOps, ...upsertOps];
};

const update = (
  resource: "business_lines" | "sales_absences",
  previousData: { id: Identifier },
  data: Record<string, unknown>,
): Operation => ({
  type: "update",
  resource,
  id: previousData.id,
  data,
  previousData,
});

/** Runs the planned writes in order; the first failure stops the rest. */
export const saveUserAssignments = async (
  dataProvider: DataProvider,
  operations: Operation[],
): Promise<void> => {
  for (const op of operations) {
    if (op.type === "update") {
      await dataProvider.update(op.resource, {
        id: op.id,
        data: op.data,
        previousData: op.previousData,
      });
    } else if (op.type === "create") {
      await dataProvider.create(op.resource, { data: op.data });
    } else {
      await dataProvider.delete(op.resource, {
        id: op.id,
        previousData: op.previousData,
      });
    }
  }
};

/** Input validator: nobody substitutes for themselves. */
export const notSelf =
  (saleId: Identifier | undefined) =>
  (value: Identifier | null | undefined): string | undefined =>
    sameId(value, saleId)
      ? "resources.sales.validation.self_substitute"
      : undefined;

/** Input validator for absences.N.ends_on: the range ends on or after it starts. */
export const endsOnOrAfterStart = (
  value: string | undefined,
  allValues: { absences?: AbsenceFormValue[] },
  // ra-core passes the full path ("absences.0.ends_on") as finalSource.
  props?: { finalSource?: string },
): string | undefined => {
  const index = Number(props?.finalSource?.split(".")[1]);
  const startsOn = allValues.absences?.[index]?.starts_on;
  return value && startsOn && value < startsOn
    ? "resources.sales.validation.absence_range"
    : undefined;
};
