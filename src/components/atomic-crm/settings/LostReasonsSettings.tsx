import {
  useCanAccess,
  useCreate,
  useGetList,
  useNotify,
  useTranslate,
  useUpdate,
  type Identifier,
} from "ra-core";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { LostReason } from "../types";

const T = "tekfusion.settings.lost_reasons";
const C = "tekfusion.settings.catalogs";

/** Lost reasons offered when a lead is closed as lost (RF-14). Management only. */
export const LostReasonsSettings = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  const { data = [], refetch } = useGetList<LostReason>("lost_reasons", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "position", order: "ASC" },
  });
  const [create] = useCreate();
  const [update] = useUpdate();
  // id = null: a new reason; undefined: nothing being edited.
  const [editing, setEditing] = useState<{
    id: Identifier | null;
    name: string;
  }>();

  if (!canAccess) return null;

  const options = {
    onSuccess: () => {
      setEditing(undefined);
      refetch();
    },
    onError: () => notify(`${C}.error`, { type: "error" }),
  };

  const patch = (reason: LostReason, changes: Partial<LostReason>) =>
    update(
      "lost_reasons",
      { id: reason.id, data: changes, previousData: reason },
      options,
    );

  // Swap positions with the neighbour; positions are rewritten from the list
  // order so gaps or repeated values left by older data heal themselves.
  const move = (index: number, offset: -1 | 1) => {
    const order = [...data];
    [order[index], order[index + offset]] = [
      order[index + offset],
      order[index],
    ];
    order.forEach((reason, position) => {
      if (reason.position !== position) patch(reason, { position });
    });
  };

  const save = () => {
    const name = editing?.name.trim();
    if (!editing || !name) {
      notify(`${C}.required`, { type: "error" });
      return;
    }
    if (editing.id === null) {
      const position = Math.max(-1, ...data.map((r) => r.position)) + 1;
      create(
        "lost_reasons",
        { data: { name, active: true, position } },
        options,
      );
    } else {
      const reason = data.find((r) => r.id === editing.id);
      if (reason) patch(reason, { name });
    }
  };

  const editor = editing && (
    <div className="flex gap-2">
      <Input
        aria-label={translate(`${T}.name`)}
        value={editing.name}
        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setEditing(undefined)}
      >
        {translate(`${C}.cancel`)}
      </Button>
      <Button type="button" onClick={save}>
        {translate(`${C}.save`)}
      </Button>
    </div>
  );

  return (
    <Card id="lost_reasons">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate(`${T}.title`)}
        </h2>
        <ol className="divide-y" aria-label={translate(`${T}.title`)}>
          {data.map((reason, index) =>
            editing?.id === reason.id ? (
              <li key={reason.id} className="py-2">
                {editor}
              </li>
            ) : (
              <li key={reason.id} className="flex items-center gap-1 py-2">
                <span className="flex-1 text-sm">
                  {reason.name}
                  {!reason.active && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {translate(`${C}.inactive`)}
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  aria-label={translate(`${C}.move_up`, { name: reason.name })}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === data.length - 1}
                  aria-label={translate(`${C}.move_down`, {
                    name: reason.name,
                  })}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${translate(`${C}.edit`)} ${reason.name}`}
                  onClick={() =>
                    setEditing({ id: reason.id, name: reason.name })
                  }
                >
                  {translate(`${C}.edit`)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patch(reason, { active: !reason.active })}
                >
                  {translate(
                    reason.active ? `${C}.deactivate` : `${C}.activate`,
                  )}
                </Button>
              </li>
            ),
          )}
        </ol>
        {editing?.id === null ? (
          editor
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing({ id: null, name: "" })}
          >
            {translate(`${C}.add`)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
