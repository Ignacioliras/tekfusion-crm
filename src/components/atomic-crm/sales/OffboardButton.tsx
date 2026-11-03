import { useMutation } from "@tanstack/react-query";
import { UserX } from "lucide-react";
import {
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import { Confirm } from "@/components/admin/confirm";
import { Button } from "@/components/ui/button";

import type { CrmDataProvider } from "../providers/types";
import type { Sale } from "../types";

/**
 * "Dar de baja" (docs/08 checklist): runs through the users Edge Function,
 * which bans the user in Auth and calls offboard_sale(). Managers only (the
 * edit screen already is), never on oneself nor on a disabled user.
 */
export const OffboardButton = () => {
  const record = useRecordContext<Sale>();
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();
  const [isOpen, setOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => dataProvider.salesOffboard(record!.id),
    onSuccess: () => {
      setOpen(false);
      redirect("/sales");
      notify("resources.sales.offboard.success", { type: "info" });
    },
    onError: () => {
      setOpen(false);
      notify("resources.sales.offboard.error", { type: "error" });
    },
  });

  if (!record || !identity || record.id === identity.id || record.disabled) {
    return null;
  }
  const name = `${record.first_name} ${record.last_name}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-destructive border-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <UserX />
        {translate("resources.sales.offboard.button")}
      </Button>
      <Confirm
        isOpen={isOpen}
        loading={isPending}
        title="resources.sales.offboard.title"
        titleTranslateOptions={{ name }}
        content="resources.sales.offboard.content"
        confirm="resources.sales.offboard.button"
        confirmColor="warning"
        onConfirm={() => mutate()}
        onClose={() => setOpen(false)}
      />
    </>
  );
};
