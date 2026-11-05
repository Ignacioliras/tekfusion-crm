import {
  useCanAccess,
  useCreate,
  useGetList,
  useNotify,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { QuickReply } from "../types";

const T = "tekfusion.settings.quick_replies";
const C = "tekfusion.settings.catalogs";

type Draft = Omit<QuickReply, "id"> & { id?: QuickReply["id"] };

const EMPTY: Draft = { title: "", body: "", active: true };

/** WhatsApp quick replies (RF-14). Management only. */
export const QuickRepliesSettings = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const { canAccess } = useCanAccess({
    resource: "configuration",
    action: "edit",
  });
  const { data, refetch } = useGetList<QuickReply>("quick_replies", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "title", order: "ASC" },
  });
  const [create] = useCreate();
  const [update] = useUpdate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess) return null;

  const options = {
    onSuccess: () => {
      setDraft(null);
      refetch();
    },
    onError: () => notify(`${C}.error`, { type: "error" }),
  };

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.body.trim()) {
      setError(translate(`${C}.required`));
      return;
    }
    setError(null);
    const { id, ...fields } = draft;
    const values = { ...fields, title: fields.title.trim() };
    if (id == null) create("quick_replies", { data: values }, options);
    else
      update(
        "quick_replies",
        { id, data: values, previousData: data?.find((r) => r.id === id) },
        options,
      );
  };

  return (
    <Card id="quick_replies">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate(`${T}.title`)}
        </h2>
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {translate(`${C}.empty`)}
          </p>
        )}
        <ul className="divide-y">
          {data?.map((reply) => {
            const action = reply.active ? `${C}.deactivate` : `${C}.activate`;
            return (
              <li key={reply.id} className="flex items-center gap-2 py-2">
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
                    setDraft(reply);
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
                    update(
                      "quick_replies",
                      {
                        id: reply.id,
                        data: { active: !reply.active },
                        previousData: reply,
                      },
                      options,
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
                {translate(`${C}.save`)}
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
