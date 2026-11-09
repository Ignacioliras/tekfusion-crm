import { useMutation } from "@tanstack/react-query";
import { EyeOff } from "lucide-react";
import {
  useCanAccess,
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import { Confirm } from "@/components/admin/confirm";
import { Button } from "@/components/ui/button";

import type { CrmDataProvider } from "../providers/types";
import type { Contact } from "../types";

/**
 * "Anonimizar contacto" (RF-17, Ley 21.719): managers only, like the other
 * management actions (canAccess configuration/edit; the RPC checks it again).
 * Cannot be undone, hence the confirmation. Hidden once the contact is
 * anonymized (anonymized_at): the RPC would do nothing anyway.
 */
export const AnonymizeContactButton = () => {
  const record = useRecordContext<Contact>();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();
  const [isOpen, setOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => dataProvider.anonymizeContact(record!.id),
    onSuccess: ({ filesRemoved }) => {
      setOpen(false);
      refresh();
      // The contact is already anonymous: a failed file removal is reported, not undone.
      notify(
        filesRemoved
          ? "tekfusion.contacts.anonymize.success"
          : "tekfusion.contacts.anonymize.files_error",
        { type: filesRemoved ? "info" : "warning" },
      );
    },
    onError: () => {
      setOpen(false);
      notify("tekfusion.contacts.anonymize.error", { type: "error" });
    },
  });

  if (!record || !canAccess || record.anonymized_at) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-destructive border-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <EyeOff />
        {translate("tekfusion.contacts.anonymize.button")}
      </Button>
      <Confirm
        isOpen={isOpen}
        loading={isPending}
        title="tekfusion.contacts.anonymize.title"
        content="tekfusion.contacts.anonymize.content"
        confirm="tekfusion.contacts.anonymize.confirm"
        cancel="tekfusion.contacts.anonymize.cancel"
        confirmColor="warning"
        onConfirm={() => mutate()}
        onClose={() => setOpen(false)}
      />
    </>
  );
};
