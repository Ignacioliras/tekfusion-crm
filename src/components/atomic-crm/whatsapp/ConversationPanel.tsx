import { useGetList, useTranslate } from "ra-core";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WaConversation, WaMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

// ponytail: one page of 500 messages, no Realtime; paging and the Realtime
// subscription arrive with the rest of the inbox in Fase 4 (docs/07).
const MESSAGES_PAGE = { page: 1, perPage: 500 };

interface ConversationPanelProps {
  conversation: WaConversation;
  title: string;
}

export const ConversationPanel = ({
  conversation,
  title,
}: ConversationPanelProps) => {
  const translate = useTranslate();
  const comingSoon = translate("tekfusion.whatsapp.coming_soon");
  const {
    data: messages = [],
    isPending,
    error,
  } = useGetList<WaMessage>("wa_messages", {
    filter: { conversation_id: conversation.id },
    sort: { field: "sent_at", order: "ASC" },
    pagination: MESSAGES_PAGE,
  });

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
        {conversation.sales_id == null ? (
          <Button disabled title={comingSoon}>
            {translate("tekfusion.whatsapp.take")}
          </Button>
        ) : null}
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
              <MessageBubble key={message.id} message={message} />
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
        <p className="text-xs text-muted-foreground">{comingSoon}</p>
      </footer>
    </section>
  );
};
