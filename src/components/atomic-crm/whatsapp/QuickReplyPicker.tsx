import { useState, type RefObject } from "react";
import { useGetList, useTranslate } from "ra-core";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { QuickReply } from "../types";

// ponytail: first 100 active replies, no search; add one if the catalog grows.
const REPLIES_PAGE = { page: 1, perPage: 100 };

interface QuickReplyPickerProps {
  disabled: boolean;
  // Where focus goes back once a reply is picked (the composer).
  returnFocusTo: RefObject<HTMLElement | null>;
  onPick: (body: string) => void;
}

export const QuickReplyPicker = ({
  disabled,
  returnFocusTo,
  onPick,
}: QuickReplyPickerProps) => {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  // Fetched on first open, not once per conversation shown.
  const { data: replies = [], isPending } = useGetList<QuickReply>(
    "quick_replies",
    {
      filter: { active: true },
      sort: { field: "title", order: "ASC" },
      pagination: REPLIES_PAGE,
    },
    { enabled: open },
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button type="button" variant="outline" disabled={disabled} />}
      >
        {translate("tekfusion.whatsapp.quick_replies.button")}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        finalFocus={returnFocusTo}
        className="w-96 max-w-[calc(100vw-2rem)] p-2 gap-1"
        aria-label={translate("tekfusion.whatsapp.quick_replies.button")}
      >
        {isPending ? null : replies.length === 0 ? (
          <p className="p-2 text-muted-foreground">
            {translate("tekfusion.whatsapp.quick_replies.empty")}
          </p>
        ) : (
          <ul className="flex flex-col max-h-72 overflow-y-auto">
            {replies.map((reply) => (
              <li key={reply.id}>
                <button
                  type="button"
                  className="w-full rounded-sm p-2 text-left hover:bg-accent focus-visible:bg-accent outline-none"
                  onClick={() => {
                    onPick(reply.body);
                    setOpen(false);
                  }}
                >
                  <span className="block font-medium">{reply.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {reply.body}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
