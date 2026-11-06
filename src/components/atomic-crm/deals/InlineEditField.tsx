import { Pencil } from "lucide-react";
import {
  Form,
  useNotify,
  useRecordContext,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { errorMessageKey } from "../providers/supabase/accessErrors";
import type { Deal } from "../types";

interface InlineEditFieldProps {
  label: string;
  /** The deal column this field writes; only that column is sent. */
  source: keyof Deal;
  /** Read-only rendering of the value. */
  children: ReactNode;
  /** The admin input (bound to `source`) shown while editing. */
  input: ReactNode;
  canEdit: boolean;
}

/**
 * A lead field that switches to a one-input form in place ("editable en
 * línea", RF-05). Saves only its own column, so the RLS and guard triggers see
 * exactly what changed.
 */
export const InlineEditField = ({
  label,
  source,
  children,
  input,
  canEdit,
}: InlineEditFieldProps) => {
  const translate = useTranslate();
  const record = useRecordContext<Deal>();
  const [isEditing, setEditing] = useState(false);
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  if (!record) return null;

  const handleSubmit = (values: Partial<Deal>) =>
    update(
      "deals",
      {
        id: record.id,
        data: { [source]: values[source] },
        previousData: record,
      },
      {
        onSuccess: () => {
          setEditing(false);
          notify("tekfusion.common.saved", { type: "info" });
        },
        onError: (error) =>
          notify(errorMessageKey(error, "tekfusion.common.save_error"), {
            type: "error",
          }),
      },
    );

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground tracking-wide">
        {label}
      </span>
      {isEditing ? (
        <Form record={record} onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            {input}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {translate("tekfusion.common.save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                {translate("tekfusion.common.cancel")}
              </Button>
            </div>
          </div>
        </Form>
      ) : (
        <div className="group flex items-center gap-2 text-sm min-h-6">
          <div className="flex-1">{children}</div>
          {canEdit ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6 opacity-60 group-hover:opacity-100"
              aria-label={`${translate("tekfusion.common.edit")} ${label}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
