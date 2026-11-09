import { buildContact, buildSale, StoryWrapper } from "@/test/StoryWrapper";
import { DEFAULT_USER } from "../providers/fakerest/authProvider";
import { canAccess, type AccessRole } from "../providers/commons/canAccess";
import { buildWhatsAppData } from "../providers/fakerest/dataGenerator/whatsapp";
import type { CrmDataProvider } from "../providers/types";
import type { WaMessage } from "../types";
import { ConversationPanel } from "./ConversationPanel";
import { WhatsAppPage } from "./WhatsAppPage";

const HOSTILE_TEXT = "<b>hola</b><script>";

const OTHER_EXECUTIVE = 99;
const now = new Date();

// The T8 seed: chat 1 is mine (Rosa Pizarro), chat 2 another executive's
// (Andrés Vega), chat 3 an unknown, unassigned number. Rosa's newest message
// carries HTML that must show as literal text.
const whatsappData = () => {
  const seed = buildWhatsAppData({
    salesIds: [DEFAULT_USER.id, OTHER_EXECUTIVE],
    contactIds: [1, 2],
    now,
  });
  const hostile: WaMessage = {
    ...seed.wa_messages[0],
    id: seed.wa_messages.length + 1,
    wa_message_id: "DEMO-WA-HOSTIL",
    text: HOSTILE_TEXT,
    status: "entregado",
    sent_at: new Date(now.getTime() - 10 * 60_000).toISOString(),
  };
  // The ingest RPC attributes a message typed on the phone to the chat's
  // executive (docs/10); the generator leaves it without author.
  const messages = seed.wa_messages.map((message) =>
    message.from_me_phone
      ? { ...message, author_sales_id: OTHER_EXECUTIVE }
      : message,
  );
  return {
    sales: [
      buildSale(),
      buildSale({
        id: OTHER_EXECUTIVE,
        first_name: "Matías",
        last_name: "Soto",
        administrator: false,
        role: "executive",
      }),
    ],
    contacts: [
      buildContact({ id: 1, first_name: "Rosa", last_name: "Pizarro" }),
      buildContact({ id: 2, first_name: "Andrés", last_name: "Vega" }),
    ],
    wa_messages: [...messages, hostile],
    wa_conversations: seed.wa_conversations.map((conversation) =>
      conversation.id === hostile.conversation_id
        ? {
            ...conversation,
            last_message_at: hostile.sent_at,
            unread_count: conversation.unread_count + 1,
          }
        : conversation,
    ),
  };
};

// The access rules of the real app (canAccess.ts) for each role.
export const WhatsAppInbox = ({
  role,
  dataProvider,
}: {
  role: AccessRole;
  dataProvider?: Partial<CrmDataProvider>;
}) => (
  <StoryWrapper
    authProvider={{ canAccess: async (params) => canAccess(role, params) }}
    data={whatsappData()}
    dataProvider={dataProvider}
  >
    <WhatsAppPage />
  </StoryWrapper>
);

// The inbox lists no archived chat: one archived while it was open still
// shows in the panel, as this one (Rosa Pizarro's, the executive's own).
export const ArchivedChatPanel = () => {
  const data = whatsappData();
  return (
    <StoryWrapper
      authProvider={{ canAccess: async (params) => canAccess("user", params) }}
      data={data}
    >
      <ConversationPanel
        conversation={{ ...data.wa_conversations[0], archived: true }}
        title="Rosa Pizarro"
        onChange={() => undefined}
      />
    </StoryWrapper>
  );
};
