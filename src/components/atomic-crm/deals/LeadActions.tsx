import { useMutation } from "@tanstack/react-query";
import { HandHelping, PhoneCall, UserRoundCog } from "lucide-react";
import {
  CanAccess,
  Form,
  RecordContextProvider,
  required,
  useCanAccess,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRefresh,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState, type ReactNode } from "react";
import type { FieldValues } from "react-hook-form";

import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
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

import { errorMessageKey } from "../providers/supabase/accessErrors";
import type { CrmDataProvider } from "../providers/types";
import type { Deal, Sale } from "../types";

/**
 * Action bar of the lead file (RF-05). The actions go through the same check
 * as editing this lead (`CanAccess action="edit" record`): a reader sees none,
 * an executive only on their own leads. On an unassigned lead, "Tomar" is the
 * one thing an executive can do. "Reasignar" is for managers only.
 * `children` receives the quote and follow-up buttons.
 */
export const LeadActions = ({
  deal,
  children,
}: {
  deal: Deal;
  children?: ReactNode;
}) => (
  <div className="flex flex-wrap gap-2">
    {deal.sales_id == null ? (
      // useCanAccess falls back to the record in context: clear it so that
      // "Tomar" asks for the role's right (executive or manager), not this lead's.
      <RecordContextProvider value={undefined}>
        <TakeButton deal={deal} />
      </RecordContextProvider>
    ) : null}
    <CanAccess resource="deals" action="edit" record={deal}>
      {deal.stage === "nuevo" ? <MarkContactedButton deal={deal} /> : null}
      {children}
      <ReassignButton deal={deal} />
    </CanAccess>
  </div>
);

const TakeButton = ({ deal }: { deal: Deal }) => {
  // Without a record: executives and managers may edit leads, readers not.
  const { canAccess: canTake = false } = useCanAccess({
    resource: "deals",
    action: "edit",
  });
  const translate = useTranslate();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const { mutate, isPending } = useMutation({
    mutationFn: () => dataProvider.takeDeal(deal.id),
    onSuccess: () => {
      notify("tekfusion.lead.actions.taken", { type: "info" });
      refresh();
    },
    onError: (error) =>
      notify(errorMessageKey(error, "tekfusion.lead.actions.take_error"), {
        type: "error",
      }),
  });
  if (!canTake) return null;
  return (
    <Button size="sm" onClick={() => mutate()} disabled={isPending}>
      <HandHelping className="size-4" />
      {translate("tekfusion.lead.actions.take")}
    </Button>
  );
};

const requiredNote = (value?: string) =>
  value?.trim() ? undefined : "tekfusion.lead.actions.contacted_note_required";

/** Marking by hand needs a note (docs/03): the note is saved, then the stage. */
const MarkContactedButton = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const { identity } = useGetIdentity();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useMutation({
    // ponytail: two calls, not one transaction; if the update fails the note
    // stays (harmless). Move to an RPC if it has to be atomic.
    mutationFn: async (note: string) => {
      const now = new Date().toISOString();
      await dataProvider.create("deal_notes", {
        data: {
          deal_id: deal.id,
          text: note,
          date: now,
          sales_id: identity?.id,
        },
      });
      await dataProvider.update("deals", {
        id: deal.id,
        data: {
          stage: "contactado",
          first_response_at: deal.first_response_at ?? now,
          last_activity_at: now,
        },
        previousData: deal,
      });
    },
    onSuccess: () => {
      setOpen(false);
      notify("tekfusion.lead.actions.contacted", { type: "info" });
      refresh();
    },
    onError: (error) =>
      notify(errorMessageKey(error, "tekfusion.common.save_error"), {
        type: "error",
      }),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PhoneCall className="size-4" />
        {translate("tekfusion.lead.actions.mark_contacted")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate("tekfusion.lead.actions.mark_contacted_title")}
            </DialogTitle>
            <DialogDescription>
              {translate("tekfusion.lead.actions.mark_contacted_help")}
            </DialogDescription>
          </DialogHeader>
          <Form
            onSubmit={(values: FieldValues) =>
              mutate(String(values.note).trim())
            }
          >
            <TextInput
              source="note"
              label="tekfusion.lead.actions.contacted_note"
              multiline
              rows={3}
              validate={requiredNote}
              helperText={false}
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {translate("tekfusion.common.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {translate("tekfusion.lead.actions.mark_contacted")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const saleName = (sale: Sale) => `${sale.first_name} ${sale.last_name}`;

const ReassignButton = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  // Managers are the only ones allowed to list users (canAccess.ts).
  const { canAccess: isManager } = useCanAccess({
    resource: "sales",
    action: "list",
  });
  const [open, setOpen] = useState(false);
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!isManager) return null;

  const handleSubmit = (values: Partial<Deal>) =>
    update(
      "deals",
      { id: deal.id, data: { sales_id: values.sales_id }, previousData: deal },
      {
        onSuccess: () => {
          setOpen(false);
          notify("tekfusion.lead.actions.reassigned", { type: "info" });
          refresh();
        },
        onError: (error) =>
          notify(errorMessageKey(error, "tekfusion.common.save_error"), {
            type: "error",
          }),
      },
    );

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserRoundCog className="size-4" />
        {translate("tekfusion.lead.actions.reassign")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate("tekfusion.lead.actions.reassign_title")}
            </DialogTitle>
            <DialogDescription>
              {translate("tekfusion.lead.actions.reassign_help")}
            </DialogDescription>
          </DialogHeader>
          <Form record={deal} onSubmit={handleSubmit}>
            <ReferenceInput
              source="sales_id"
              reference="sales"
              filter={{ "disabled@neq": true, "role@neq": "reader" }}
              sort={{ field: "last_name", order: "ASC" }}
            >
              <AutocompleteInput
                label="tekfusion.lead.data.sales_id"
                optionText={saleName}
                validate={required()}
                helperText={false}
              />
            </ReferenceInput>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {translate("tekfusion.common.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {translate("tekfusion.lead.actions.reassign")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
