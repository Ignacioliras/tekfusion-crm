import { useCanAccess, useTranslate } from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { QuickReply } from "../types";
import { useStagedCatalog } from "./stagedCatalogs";

const T = "tekfusion.settings.quick_replies";
const C = "tekfusion.settings.catalogs";

type Row = Omit<QuickReply, "id"> & { id?: QuickReply["id"] };
// index: position of the row being edited; undefined for a new one.
type Draft = Row & { index?: number };

const EMPTY: Draft = { title: "", body: "", active: true };

/** WhatsApp quick replies (RF-14). Management only. */
export const QuickRepliesSettings = () => {
  const translate = useTranslate();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  const { rows, write } = useStagedCatalog<Row>("quick_replies", {
    field: "title",
    order: "ASC",
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess) return null;

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.body.trim()) {
      setError(translate(`${C}.required`));
      return;
    }
    setError(null);
    const { index, ...fields } = draft;
    const values = { ...fields, title: fields.title.trim() };
    write(
      index === undefined
        ? [...rows, values]
        : rows.map((row, i) => (i === index ? values : row)),
    );
    setDraft(null);
  };

  return (
    <Card id="quick_replies" role="region" aria-label={translate(`${T}.title`)}>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate(`${T}.title`)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate(`${C}.pending_hint`)}
        </p>
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {translate(`${C}.empty`)}
          </p>
        )}
        <ul className="divide-y">
          {rows.map((reply, index) => {
            const action = reply.active ? `${C}.deactivate` : `${C}.activate`;
            return (
              <li
                key={reply.id ?? `new-${index}`}
                className="flex items-center gap-2 py-2"
              >
                <span className="flex-1 text-sm">
                  {reply.title}
                  {!reply.active && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {translate(`${C}.inactive`)}
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${translate(`${C}.edit`)} ${reply.title}`}
                  onClick={() => {
                    setError(null);
                    setDraft({ ...reply, index });
                  }}
                >
                  {translate(`${C}.edit`)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${translate(action)} ${reply.title}`}
                  onClick={() =>
                    write(
                      rows.map((row, i) =>
                        i === index ? { ...row, active: !row.active } : row,
                      ),
                    )
                  }
                >
                  {translate(action)}
                </Button>
              </li>
            );
          })}
        </ul>
        {draft ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="quick-reply-title">
                {translate(`${T}.name`)}
              </Label>
              <Input
                id="quick-reply-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quick-reply-body">{translate(`${T}.body`)}</Label>
              <Textarea
                id="quick-reply-body"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft(null)}
              >
                {translate(`${C}.cancel`)}
              </Button>
              <Button type="button" onClick={save}>
                {translate(`${C}.apply`)}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError(null);
              setDraft(EMPTY);
            }}
          >
            {translate(`${C}.add`)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
