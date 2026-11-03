import { useMutation } from "@tanstack/react-query";
import {
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRefresh,
} from "ra-core";

import type { Deal } from "../types";
import type { ClosingStage, ClosingValues } from "./CloseDealDialog";

/** The deal columns a closing writes (guard_deal_closing checks them in the base). */
export const closingData = (
  stage: ClosingStage,
  values: ClosingValues,
): Partial<Deal> =>
  stage === "ganado"
    ? { stage, won_amount: Math.round(Number(values.won_amount)) }
    : { stage, lost_reason_id: values.lost_reason_id };

/**
 * Persists a closing: the stage with its amount or reason, plus the optional
 * note of a lost lead. `persist` lets the kanban move the card with its own
 * index bookkeeping; the lead file uses a plain update.
 */
export const useCloseDeal = () => {
  const dataProvider = useDataProvider();
  const { identity } = useGetIdentity();
  const notify = useNotify();
  const refresh = useRefresh();

  return useMutation({
    mutationFn: async ({
      deal,
      stage,
      values,
      persist,
    }: {
      deal: Deal;
      stage: ClosingStage;
      values: ClosingValues;
      persist?: (deal: Deal, data: Partial<Deal>) => Promise<unknown>;
    }) => {
      const data = {
        ...closingData(stage, values),
        last_activity_at: new Date().toISOString(),
      };
      if (persist) {
        await persist(deal, data);
      } else {
        await dataProvider.update("deals", {
          id: deal.id,
          data,
          previousData: deal,
        });
      }
      const note = values.note?.trim();
      if (note) {
        await dataProvider.create("deal_notes", {
          data: {
            deal_id: deal.id,
            text: note,
            date: new Date().toISOString(),
            sales_id: identity?.id,
          },
        });
      }
      return stage;
    },
    onSuccess: (stage) => {
      notify(
        stage === "ganado"
          ? "tekfusion.closing.done_won"
          : "tekfusion.closing.done_lost",
        { type: "info" },
      );
      refresh();
    },
    onError: () => notify("tekfusion.common.save_error", { type: "error" }),
  });
};
