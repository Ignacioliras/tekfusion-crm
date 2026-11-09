import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  useDataProvider,
  useGetList,
  useGetMany,
  useNotify,
  useRefresh,
  useTranslate,
} from "ra-core";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CrmDataProvider } from "../providers/types";
import { errorMessageKey } from "../providers/supabase/accessErrors";
import type { Sale, WaConversation, WaMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

// ponytail: one page of 500 messages, no Realtime; paging and the Realtime
// subscription arrive with the rest of the inbox in Fase 4 (docs/07).
const MESSAGES_PAGE = { page: 1, perPage: 500 };

interface ConversationPanelProps {
  conversation: WaConversation;
  title: string;
  onChange: (conversation: WaConversation) => void;
}

export const ConversationPanel = ({
  conversation,
  title,
  onChange,
}: ConversationPanelProps) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const refresh = useRefresh();
  const {
    data: messages = [],
    isPending,
    error,
  } = useGetList<WaMessage>("wa_messages", {
    filter: { conversation_id: conversation.id },
    sort: { field: "sent_at", order: "ASC" },
    pagination: MESSAGES_PAGE,
  });

  // Authors of the whole conversation in one query, not one per bubble.
  const authorIds = [
    ...new Set(
      messages.flatMap((message) =>
        message.author_sales_id == null ? [] : [message.author_sales_id],
      ),
    ),
  ];
  const { data: authors = [] } = useGetMany<Sale>(
    "sales",
    { ids: authorIds },
    { enabled: authorIds.length > 0 },
  );
  const authorNames = new Map(
    authors.map((sale) => [sale.id, `${sale.first_name} ${sale.last_name}`]),
  );

  const take = useMutation({
    mutationFn: () => dataProvider.takeWaConversation(conversation.id),
    onSuccess: (taken) => {
      notify("tekfusion.whatsapp.taken", { type: "info" });
      onChange(taken);
      refresh();
    },
    onError: (takeError) =>
      notify(errorMessageKey(takeError, "tekfusion.whatsapp.take_error"), {
        type: "error",
      }),
  });

  // Opening an assigned chat reads it (docs/10): the RPC leaves unassigned ones
  // untouched, so they are not even asked. Taking one assigns it, then reads it.
  const { mutate: markRead } = useMutation({
    mutationFn: () => dataProvider.markWaConversationRead(conversation.id),
    onSuccess: (marked) => {
      if (marked > 0) refresh();
    },
    onError: (readError) =>
      notify(errorMessageKey(readError, "tekfusion.whatsapp.read_error"), {
        type: "error",
      }),
  });
  const isAssigned = conversation.sales_id != null;
  const hasUnread = conversation.unread_count > 0;
  useEffect(() => {
    if (isAssigned && hasUnread) markRead();
  }, [conversation.id, isAssigned, hasUnread, markRead]);

  return (
    <section
      aria-label={title}
      className="flex flex-col border rounded-lg min-h-[60vh] max-h-[80vh]"
    >
      <header className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{conversation.phone}</p>
        </div>
        {isAssigned ? null : (
          <Button onClick={() => take.mutate()} disabled={take.isPending}>
            {translate("tekfusion.whatsapp.take")}
          </Button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        {error ? (
          <p className="text-destructive">
            {translate("tekfusion.whatsapp.error")}
          </p>
        ) : !isPending && messages.length === 0 ? (
          <p className="text-muted-foreground">
            {translate("tekfusion.whatsapp.no_messages")}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                authorName={
                  message.author_sales_id == null
                    ? undefined
                    : authorNames.get(message.author_sales_id)
                }
              />
            ))}
          </ol>
        )}
      </div>
      <footer className="border-t p-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <Textarea
            disabled
            aria-label={translate("tekfusion.whatsapp.compose")}
            placeholder={translate("tekfusion.whatsapp.compose")}
            className="flex-1"
          />
          <Button disabled>{translate("tekfusion.whatsapp.send")}</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {translate("tekfusion.whatsapp.coming_soon")}
        </p>
      </footer>
    </section>
  );
};
