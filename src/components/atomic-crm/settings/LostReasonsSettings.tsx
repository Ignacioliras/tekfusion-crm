import { useCanAccess, useNotify, useTranslate } from "ra-core";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { LostReason } from "../types";
import { useStagedCatalog } from "./stagedCatalogs";

type Row = Omit<LostReason, "id"> & { id?: LostReason["id"] };

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
  const { rows: data, write } = useStagedCatalog<Row>("lost_reasons", {
    field: "position",
    order: "ASC",
  });
  // index = null: a new reason; undefined: nothing being edited.
  const [editing, setEditing] = useState<{
    index: number | null;
    name: string;
  }>();

  if (!canAccess) return null;

  const patch = (index: number, changes: Partial<Row>) =>
    write(data.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  // Positions are rewritten from the list order when saving.
  const move = (index: number, offset: -1 | 1) => {
    const order = [...data];
    [order[index], order[index + offset]] = [
      order[index + offset],
      order[index],
    ];
    write(order);
  };

  const save = () => {
    const name = editing?.name.trim();
    if (!editing || !name) {
      notify(`${C}.required`, { type: "error" });
      return;
    }
    if (editing.index === null) {
      write([...data, { name, active: true, position: data.length }]);
    } else {
      patch(editing.index, { name });
    }
    setEditing(undefined);
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
        {translate(`${C}.apply`)}
      </Button>
    </div>
  );

  return (
    <Card id="lost_reasons" role="region" aria-label={translate(`${T}.title`)}>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate(`${T}.title`)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate(`${C}.pending_hint`)}
        </p>
        <ol className="divide-y" aria-label={translate(`${T}.title`)}>
          {data.map((reason, index) =>
            editing?.index === index ? (
              <li key={reason.id ?? `new-${index}`} className="py-2">
                {editor}
              </li>
            ) : (
              <li
                key={reason.id ?? `new-${index}`}
                className="flex flex-wrap items-center gap-1 py-2"
              >
                <span className="basis-full text-sm sm:basis-0 sm:flex-1">
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
                  onClick={() => setEditing({ index, name: reason.name })}
                >
                  {translate(`${C}.edit`)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patch(index, { active: !reason.active })}
                >
                  {translate(
                    reason.active ? `${C}.deactivate` : `${C}.activate`,
                  )}
                </Button>
              </li>
            ),
          )}
        </ol>
        {editing?.index === null ? (
          editor
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing({ index: null, name: "" })}
          >
            {translate(`${C}.add`)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
