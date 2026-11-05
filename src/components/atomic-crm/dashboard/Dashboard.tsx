import { useGetList } from "ra-core";

import { ManagementDashboard } from "../management-dashboard/ManagementDashboard";
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
      <div className="md:col-span-12">
        <ManagementDashboard />
      </div>
      {/* Side widgets render nothing when empty: the middle column takes their room. */}
      <div className="flex flex-col gap-6 md:col-span-12 md:flex-row">
        <HotContacts className="md:w-1/4 md:shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {totalDeal ? <DealsChart /> : null}
          <DashboardActivityLog />
        </div>
        <TasksList className="md:w-1/4 md:shrink-0" />
      </div>
    </div>
  );
};
