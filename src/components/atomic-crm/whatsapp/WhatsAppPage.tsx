import { useState } from "react";
import { useCanAccess, useGetIdentity, useTranslate } from "ra-core";
import { MessageCircle } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WaConversation } from "../types";
import { ConversationList } from "./ConversationList";
import { ConversationPanel } from "./ConversationPanel";

// Read-only inbox over the stored conversations (RF-08, docs/07). Taking a
// chat, sending and Realtime come in Fase 4.
const TABS = ["mine", "unassigned", "all"] as const;
type Tab = (typeof TABS)[number];

export const WhatsAppPage = () => {
  const translate = useTranslate();
  const { data: identity } = useGetIdentity();
  const { canAccess: canList, isPending } = useCanAccess({
    resource: "wa_conversations",
    action: "list",
  });
  const { canAccess: canListAll } = useCanAccess({
    resource: "wa_conversations",
    action: "list_all",
  });
  const [tab, setTab] = useState<Tab>("mine");
  const [selected, setSelected] = useState<{
    conversation: WaConversation;
    title: string;
  } | null>(null);

  if (isPending || !identity) return null;

  if (!canList) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <MessageCircle className="size-10" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">
          {translate("tekfusion.whatsapp.title")}
        </h1>
        <p role="status">{translate("tekfusion.whatsapp.no_access")}</p>
      </div>
    );
  }

  const tabs = canListAll ? TABS : TABS.filter((t) => t !== "all");
  const filter =
    tab === "mine"
      ? { sales_id: identity.id }
      : tab === "unassigned"
        ? { "sales_id@is": null }
        : {};

  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-xl font-semibold">
        {translate("tekfusion.whatsapp.title")}
      </h1>
      <div className="grid gap-4 md:grid-cols-[minmax(260px,340px)_1fr]">
        <div className="flex flex-col gap-2 border rounded-lg">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as Tab);
              setSelected(null);
            }}
          >
            <TabsList className="w-full">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {translate(`tekfusion.whatsapp.tabs.${t}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ConversationList
            key={tab}
            filter={filter}
            selectedId={selected?.conversation.id}
            onSelect={(conversation, title) =>
              setSelected({ conversation, title })
            }
          />
        </div>
        {selected ? (
          <ConversationPanel
            key={selected.conversation.id}
            conversation={selected.conversation}
            title={selected.title}
          />
        ) : (
          <p className="text-muted-foreground p-6 border rounded-lg">
            {translate("tekfusion.whatsapp.pick")}
          </p>
        )}
      </div>
    </div>
  );
};

WhatsAppPage.path = "/whatsapp";
