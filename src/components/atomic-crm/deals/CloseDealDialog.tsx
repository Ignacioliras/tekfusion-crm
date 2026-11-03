import { Form, useTranslate, type Identifier } from "ra-core";
import type { FieldValues } from "react-hook-form";

import { NumberInput } from "@/components/admin/number-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Deal } from "../types";

export type ClosingStage = "ganado" | "perdido";
export const CLOSING_STAGES: readonly string[] = ["ganado", "perdido"];

export interface ClosingValues {
  won_amount?: number;
  lost_reason_id?: Identifier;
  note?: string;
}

// Form-level on purpose: the reason select mounts after its choices load, so a
// field validator could miss an early submit.
const validateClosing = (isWon: boolean) => (values: FieldValues) => {
  if (isWon) {
    return !values.won_amount || values.won_amount < 1
      ? { won_amount: "tekfusion.closing.won_amount_required" }
      : {};
  }
  return values.lost_reason_id
    ? {}
    : { lost_reason_id: "tekfusion.closing.lost_reason_required" };
};

/**
 * Ganado asks for the final amount; perdido for a reason (configurable list,
 * Configuración → Motivos de pérdida) and an optional note (RF-04). Used by
 * the lead file and by the kanban when a card is dropped on those columns.
 */
export const CloseDealDialog = ({
  deal,
  stage,
  isPending,
  onConfirm,
  onCancel,
}: {
  deal: Deal;
  stage: ClosingStage | null;
  isPending?: boolean;
  onConfirm: (values: ClosingValues) => void;
  onCancel: () => void;
}) => {
  const translate = useTranslate();
  const isWon = stage === "ganado";

  return (
    <Dialog open={stage != null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate(
              isWon
                ? "tekfusion.closing.won_title"
                : "tekfusion.closing.lost_title",
            )}
          </DialogTitle>
          <DialogDescription>
            {deal.name} ·{" "}
            {translate(
              isWon
                ? "tekfusion.closing.won_help"
                : "tekfusion.closing.lost_help",
            )}
          </DialogDescription>
        </DialogHeader>
        <Form
          defaultValues={
            isWon ? { won_amount: deal.won_amount ?? deal.amount } : {}
          }
          validate={validateClosing(isWon)}
          onSubmit={(values: FieldValues) => onConfirm(values as ClosingValues)}
        >
          <div className="flex flex-col gap-4">
            {isWon ? (
              <NumberInput
                source="won_amount"
                label="tekfusion.lead.data.won_amount"
                step={1}
                helperText={false}
              />
            ) : (
              <>
                <ReferenceInput
                  source="lost_reason_id"
                  reference="lost_reasons"
                  filter={{ active: true }}
                  sort={{ field: "position", order: "ASC" }}
                >
                  <SelectInput
                    label="tekfusion.lead.data.lost_reason"
                    optionText="name"
                  />
                </ReferenceInput>
                <TextInput
                  source="note"
                  label="tekfusion.closing.lost_note"
                  multiline
                  rows={3}
                  helperText={false}
                />
              </>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onCancel}>
              {translate("tekfusion.common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {translate("tekfusion.closing.confirm")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
