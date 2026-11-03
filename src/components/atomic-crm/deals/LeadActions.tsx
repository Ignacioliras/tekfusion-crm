import { useMutation } from "@tanstack/react-query";
import { HandHelping, PhoneCall, UserRoundCog } from "lucide-react";
import {
  CanAccess,
  Form,
  required,
  useCanAccess,
  useDataProvider,
  useNotify,
  useRefresh,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState, type ReactNode } from "react";

import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { CrmDataProvider } from "../providers/types";
import type { Deal, Sale } from "../types";

/**
 * Action bar of the lead file (RF-05). Every action goes through the same
 * role check as editing (`CanAccess action="edit"`): a reader sees none.
 * "Reasignar" is for managers only. `children` receives the quote and
 * follow-up buttons.
 */
export const LeadActions = ({
  deal,
  children,
}: {
  deal: Deal;
  children?: ReactNode;
}) => (
  <CanAccess resource="deals" action="edit" record={deal}>
    <div className="flex flex-wrap gap-2">
      {deal.sales_id == null ? <TakeButton deal={deal} /> : null}
      {deal.stage === "nuevo" ? <MarkContactedButton deal={deal} /> : null}
      {children}
      <ReassignButton deal={deal} />
    </div>
  </CanAccess>
);

const TakeButton = ({ deal }: { deal: Deal }) => {
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
    onError: () =>
      notify("tekfusion.lead.actions.take_error", { type: "error" }),
  });
  return (
    <Button size="sm" onClick={() => mutate()} disabled={isPending}>
      <HandHelping className="size-4" />
      {translate("tekfusion.lead.actions.take")}
    </Button>
  );
};

const MarkContactedButton = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const handleClick = () => {
    const now = new Date().toISOString();
    update(
      "deals",
      {
        id: deal.id,
        data: {
          stage: "contactado",
          first_response_at: deal.first_response_at ?? now,
          last_activity_at: now,
        },
        previousData: deal,
      },
      {
        onSuccess: () => {
          notify("tekfusion.lead.actions.contacted", { type: "info" });
          refresh();
        },
        onError: () => notify("tekfusion.common.save_error", { type: "error" }),
      },
    );
  };
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
    >
      <PhoneCall className="size-4" />
      {translate("tekfusion.lead.actions.mark_contacted")}
    </Button>
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
        onError: () => notify("tekfusion.common.save_error", { type: "error" }),
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
