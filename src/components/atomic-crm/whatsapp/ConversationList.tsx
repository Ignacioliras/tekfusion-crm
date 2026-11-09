import { useGetList, useGetMany, useTranslate, type Identifier } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Contact, WaConversation, WaMessage } from "../types";

const LIST_PAGE = { page: 1, perPage: 100 };

interface ConversationListProps {
  filter: Record<string, unknown>;
  selectedId?: Identifier;
  onSelect: (conversation: WaConversation, title: string) => void;
}

export const ConversationList = ({
  filter,
  selectedId,
  onSelect,
}: ConversationListProps) => {
  const translate = useTranslate();
  const {
    data: conversations = [],
    isPending,
    error,
  } = useGetList<WaConversation>("wa_conversations", {
    filter: { ...filter, archived: false },
    sort: { field: "last_message_at", order: "DESC" },
    pagination: LIST_PAGE,
  });
  const ids = conversations.map((conversation) => conversation.id);
  const contactIds = conversations.flatMap((c) =>
    c.contact_id != null ? [c.contact_id] : [],
  );
  const { data: contacts = [] } = useGetMany<Contact>(
    "contacts",
    { ids: contactIds },
    { enabled: contactIds.length > 0 },
  );
  // ponytail: reads the listed chats' messages to find each last one; a
  // last-message column or view replaces this when Fase 4 adds Realtime.
  const { data: messages = [] } = useGetList<WaMessage>(
    "wa_messages",
    {
      filter: { "conversation_id@in": `(${ids.join(",")})` },
      sort: { field: "sent_at", order: "DESC" },
      pagination: { page: 1, perPage: 1000 },
    },
    { enabled: ids.length > 0 },
  );

  if (error) {
    return (
      <p className="p-3 text-destructive">
        {translate("tekfusion.whatsapp.error")}
      </p>
    );
  }
  if (!isPending && conversations.length === 0) {
    return (
      <p className="p-3 text-muted-foreground">
        {translate("tekfusion.whatsapp.empty")}
      </p>
    );
  }

  const titleOf = (conversation: WaConversation) => {
    const contact = contacts.find((c) => c.id === conversation.contact_id);
    const name = contact
      ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
      : "";
    return name || conversation.phone;
  };
  const excerptOf = (conversation: WaConversation) => {
    const last = messages.find((m) => m.conversation_id === conversation.id);
    if (!last) return "";
    return last.text || translate(`tekfusion.whatsapp.types.${last.type}`);
  };

  return (
    <ul className="flex flex-col divide-y">
      {conversations.map((conversation) => {
        const title = titleOf(conversation);
        return (
          <li key={conversation.id}>
            <button
              type="button"
              aria-current={conversation.id === selectedId ? "true" : undefined}
              onClick={() => onSelect(conversation, title)}
              className={cn(
                "w-full text-left p-3 flex items-start gap-2 hover:bg-muted",
                conversation.id === selectedId && "bg-muted",
              )}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{title}</span>
                <span className="block text-sm text-muted-foreground truncate">
                  {excerptOf(conversation)}
                </span>
              </span>
              {conversation.unread_count > 0 ? (
                <Badge
                  aria-label={translate("tekfusion.whatsapp.unread", {
                    count: conversation.unread_count,
                  })}
                >
                  {conversation.unread_count}
                </Badge>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
