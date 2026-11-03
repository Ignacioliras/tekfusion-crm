import { useMutation } from "@tanstack/react-query";
import { Archive, ArchiveRestore } from "lucide-react";
import {
  ShowBase,
  useDataProvider,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useTranslate,
  useUpdate,
  CanAccess,
} from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditButton } from "@/components/admin/edit-button";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import type { Deal } from "../types";
import { LeadActions } from "./LeadActions";
import { LeadDataBlock } from "./LeadDataBlock";
import { LeadTimeline } from "./LeadTimeline";

export const DealShow = ({ open, id }: { open: boolean; id?: string }) => {
  const redirect = useRedirect();
  const handleClose = () => {
    redirect("list", "deals");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="lg:max-w-6xl p-4 overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        {id ? (
          <ShowBase id={id}>
            <DealShowContent />
          </ShowBase>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const DealShowContent = () => {
  const record = useRecordContext<Deal>();
  if (!record) return null;

  return (
    <div className="flex flex-col gap-6">
      {record.archived_at ? <ArchivedTitle /> : null}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <ReferenceField source="company_id" reference="companies" link="show">
            <CompanyAvatar />
          </ReferenceField>
          <h2 className="text-xl font-semibold">{record.name}</h2>
        </div>
        <div className={`flex gap-2 ${record.archived_at ? "" : "pr-12"}`}>
          {record.archived_at ? (
            <>
              <CanAccess resource="deals" action="edit" record={record}>
                <UnarchiveButton record={record} />
              </CanAccess>
              <DeleteButton />
            </>
          ) : (
            <>
              <CanAccess resource="deals" action="edit" record={record}>
                <ArchiveButton record={record} />
              </CanAccess>
              <EditButton />
            </>
          )}
        </div>
      </div>

      {record.archived_at ? null : <LeadActions deal={record} />}

      {record.description ? (
        <p className="text-sm leading-6 whitespace-pre-line">
          {record.description}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-6">
          <LeadDataBlock deal={record} />
        </aside>
        <div className="min-w-0">
          <Separator className="mb-4 lg:hidden" />
          <LeadTimeline deal={record} />
        </div>
      </div>
    </div>
  );
};

const ArchivedTitle = () => {
  const translate = useTranslate();
  return (
    <div className="bg-orange-500 px-6 py-4">
      <h3 className="text-lg font-bold text-white">
        {translate("resources.deals.archived.title")}
      </h3>
    </div>
  );
};

const ArchiveButton = ({ record }: { record: Deal }) => {
  const translate = useTranslate();
  const [update] = useUpdate();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();
  const handleClick = () => {
    update(
      "deals",
      {
        id: record.id,
        data: { archived_at: new Date().toISOString() },
        previousData: record,
      },
      {
        onSuccess: () => {
          redirect("list", "deals");
          notify("resources.deals.archived.success", {
            type: "info",
            undoable: false,
          });
          refresh();
        },
        onError: () => {
          notify("resources.deals.archived.error", {
            type: "error",
          });
        },
      },
    );
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <Archive className="w-4 h-4" />
      {translate("resources.deals.archived.action")}
    </Button>
  );
};

const UnarchiveButton = ({ record }: { record: Deal }) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();

  const { mutate } = useMutation({
    mutationFn: () => dataProvider.unarchiveDeal(record),
    onSuccess: () => {
      redirect("list", "deals");
      notify("resources.deals.unarchived.success", {
        type: "info",
        undoable: false,
      });
      refresh();
    },
    onError: () => {
      notify("resources.deals.unarchived.error", {
        type: "error",
      });
    },
  });

  const handleClick = () => {
    mutate();
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <ArchiveRestore className="w-4 h-4" />
      {translate("resources.deals.unarchived.action")}
    </Button>
  );
};
