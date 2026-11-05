import { CheckSquare } from "lucide-react";
import { useGetIdentity, useGetList, useTranslate } from "ra-core";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { AddTask } from "../tasks/AddTask";
import { TasksListContent } from "../tasks/TasksListContent";
import { isDone, isRecentlyDone } from "../tasks/tasksPredicate";

/**
 * The user's upcoming tasks; nothing at all while there are none (no Atomic
 * help text). Same query as TasksListByDueDate, so it is fetched once.
 */
export const TasksList = ({ className }: { className?: string }) => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { data: tasks, isPending } = useGetList(
    "tasks",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "due_date", order: "ASC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: !!identity },
  );
  const hasTasks = tasks?.some((task) => !isDone(task) || isRecentlyDone(task));
  if (isPending || !hasTasks) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center">
        <div className="mr-3 flex">
          <CheckSquare className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          {translate("crm.dashboard.upcoming_tasks", {
            _: "Upcoming Tasks",
          })}
        </h2>
        <AddTask display="icon" selectContact />
      </div>
      <Card className="p-4 mb-2">
        <TasksListContent />
      </Card>
    </div>
  );
};
