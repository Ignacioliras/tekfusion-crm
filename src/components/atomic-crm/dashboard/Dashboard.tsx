import { useGetList } from "ra-core";

import type { Deal } from "../types";
import { DashboardActivityLog } from "./DashboardActivityLog";
import { DealsChart } from "./DealsChart";
import { HotContacts } from "./HotContacts";
import { TasksList } from "./TasksList";

// Atomic's onboarding stepper is not used: the real dashboard comes in Fase 6.
export const Dashboard = () => {
  const { total: totalDeal, isPending } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 1 },
  });

  if (isPending) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
      <div className="md:col-span-3">
        <div className="flex flex-col gap-4">
          <HotContacts />
        </div>
      </div>
      <div className="md:col-span-6">
        <div className="flex flex-col gap-6">
          {totalDeal ? <DealsChart /> : null}
          <DashboardActivityLog />
        </div>
      </div>

      <div className="md:col-span-3">
        <TasksList />
      </div>
    </div>
  );
};
