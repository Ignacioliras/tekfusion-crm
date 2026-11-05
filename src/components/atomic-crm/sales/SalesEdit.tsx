import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDataProvider,
  useEditController,
  useGetList,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
} from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/admin/simple-form";
import { CancelButton } from "@/components/admin/cancel-button";
import { SaveButton } from "@/components/admin/form";
import { Card, CardContent } from "@/components/ui/card";

import type { CrmDataProvider } from "../providers/types";
import type { Sale, SalesAbsence, SalesFormData } from "../types";
import { withRole } from "./roles";
import { getSalesErrorNotification } from "./salesErrorNotification";
import { OffboardButton } from "./OffboardButton";
import { SalesInputs } from "./SalesInputs";
import { UserAssignmentInputs } from "./UserAssignmentInputs";
import {
  getUserAssignmentValues,
  planUserAssignments,
  saveUserAssignments,
  type BusinessLineRecord,
  type UserAssignmentValues,
} from "./userAssignments";

type SalesEditFormData = SalesFormData &
  UserAssignmentValues & { signature?: string | null };

function EditToolbar() {
  return (
    <div className="flex justify-between gap-4">
      <OffboardButton />
      <div className="flex gap-4">
        <CancelButton />
        <SaveButton />
      </div>
    </div>
  );
}

// ponytail: 100 is far above TekFusion's handful of users and absences.
const ALL = { pagination: { page: 1, perPage: 100 } };

export function SalesEdit() {
  const { record } = useEditController<Sale>();
  const { data: lines, isPending: linesPending } =
    useGetList<BusinessLineRecord>("business_lines", ALL);
  const { data: absences, isPending: absencesPending } =
    useGetList<SalesAbsence>("sales_absences", {
      ...ALL,
      filter: record ? { sales_id: record.id } : {},
    });

  const dataProvider = useDataProvider<CrmDataProvider>();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesEditFormData) => {
      if (!record) {
        throw new Error(
          translate("resources.sales.edit.record_not_found", {
            _: "Record not found",
          }),
        );
      }
      const {
        line_codes,
        substitute_sales_id,
        absences: submitted,
        signature,
        ...sale
      } = data;
      const updated = await dataProvider.salesUpdate(record.id, withRole(sale));
      // The users Edge Function does not carry the signature; authenticated
      // may update that column directly (12_tekfusion_grants.sql).
      if ((signature || null) !== (record.signature || null)) {
        await dataProvider.update<Sale>("sales", {
          id: record.id,
          data: { signature: signature || null },
          previousData: record,
        });
      }
      await saveUserAssignments(
        dataProvider,
        planUserAssignments(
          record.id,
          { line_codes, substitute_sales_id, absences: submitted ?? [] },
          lines ?? [],
          absences ?? [],
        ),
      );
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_lines"] });
      queryClient.invalidateQueries({ queryKey: ["sales_absences"] });
      redirect("/sales");
      notify("resources.sales.edit.success", {
        messageArgs: {
          _: "User updated successfully",
        },
      });
    },
    onError: (error) => {
      const { message, args } = getSalesErrorNotification(
        error,
        "resources.sales.edit.error",
      );
      notify(message, {
        type: "error",
        messageArgs: { ...args, _: "An error occurred. Please try again." },
      });
    },
  });

  const onSubmit: SubmitHandler<SalesEditFormData> = async (data) => {
    mutate(data);
  };

  if (!record || linesPending || absencesPending) return null;

  const formRecord = {
    ...record,
    ...getUserAssignmentValues(record.id, lines ?? [], absences ?? []),
  };

  return (
    <div className="max-w-2xl w-full mx-auto mt-8">
      <Card>
        <CardContent>
          <SimpleForm
            toolbar={<EditToolbar />}
            onSubmit={onSubmit as SubmitHandler<any>}
            record={formRecord}
          >
            <SaleEditTitle />
            <SalesInputs />
            <UserAssignmentInputs />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}

const SaleEditTitle = () => {
  const record = useRecordContext<Sale>();
  const translate = useTranslate();
  if (!record) return null;
  return (
    <h2 className="text-lg font-semibold mb-4">
      {translate("resources.sales.edit.title", {
        name: `${record.first_name} ${record.last_name}`,
      })}
    </h2>
  );
};
