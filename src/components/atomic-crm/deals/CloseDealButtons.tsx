import { Trophy, XCircle } from "lucide-react";
import { useTranslate } from "ra-core";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Deal } from "../types";
import { CloseDealDialog, type ClosingStage } from "./CloseDealDialog";
import { useCloseDeal } from "./useCloseDeal";

/** "Ganado" / "Perdido" from the lead file, through the same dialog as the kanban. */
export const CloseDealButtons = ({ deal }: { deal: Deal }) => {
  const translate = useTranslate();
  const [stage, setStage] = useState<ClosingStage | null>(null);
  const { mutate, isPending } = useCloseDeal();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setStage("ganado")}>
        <Trophy className="size-4" />
        {translate("tekfusion.lead.actions.won")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setStage("perdido")}>
        <XCircle className="size-4" />
        {translate("tekfusion.lead.actions.lost")}
      </Button>
      <CloseDealDialog
        deal={deal}
        stage={stage}
        isPending={isPending}
        onCancel={() => setStage(null)}
        onConfirm={(values) =>
          stage &&
          mutate({ deal, stage, values }, { onSuccess: () => setStage(null) })
        }
      />
    </>
  );
};
