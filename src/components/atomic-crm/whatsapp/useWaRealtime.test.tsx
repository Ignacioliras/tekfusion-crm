import { useEffect } from "react";
import { useDataProvider, type DataProvider, type Identifier } from "ra-core";
import { render } from "vitest-browser-react";

import { StoryWrapper } from "@/test/StoryWrapper";
import { canAccess, type AccessRole } from "../providers/commons/canAccess";
import { DEFAULT_USER } from "../providers/fakerest/authProvider";
import { buildWhatsAppData } from "../providers/fakerest/dataGenerator/whatsapp";
import type { WaConversation, WaMessage } from "../types";
import { WhatsAppPage } from "./WhatsAppPage";

// A stand-in for the Supabase client: channels that deliver a change to the
// listeners of its table whose filter matches the row, as Realtime does.
const realtime = vi.hoisted(() => {
  interface Listener {
    table: string;
    filter?: string;
    callback: () => void;
  }
  interface FakeChannel {
    listeners: Listener[];
    onStatus?: (status: string) => void;
    on: (
      type: string,
      filter: { table: string; filter?: string },
      callback: () => void,
    ) => FakeChannel;
    subscribe: (onStatus: (status: string) => void) => FakeChannel;
  }
  let open: FakeChannel[] = [];
  const client = {
    channel: (): FakeChannel => {
      const channel: FakeChannel = {
        listeners: [],
        on: (_type, { table, filter }, callback) => {
          channel.listeners.push({ table, filter, callback });
          return channel;
        },
        subscribe: (onStatus) => {
          channel.onStatus = onStatus;
          return channel;
        },
      };
      open.push(channel);
      return channel;
    },
    removeChannel: vi.fn(async (channel: FakeChannel) => {
      open = open.filter((other) => other !== channel);
      return "ok";
    }),
  };
  return {
    client,
    openChannels: () => open,
    reset: () => {
      open = [];
      client.removeChannel.mockClear();
    },
    emit: (table: string, row: { conversation_id?: unknown }) => {
      for (const channel of open) {
        for (const listener of channel.listeners) {
          const matches =
            listener.filter === undefined ||
            listener.filter === `conversation_id=eq.${row.conversation_id}`;
          if (listener.table === table && matches) listener.callback();
        }
      }
    },
    // The socket dropped and every channel joined again.
    rejoin: () => {
      for (const channel of open) channel.onStatus?.("SUBSCRIBED");
    },
  };
});

vi.mock("../providers/supabase/supabase", () => ({
  getSupabaseClient: () => realtime.client,
}));

const OTHER_EXECUTIVE = 99;
const MY_CHAT = "+56900000001";
const NEW_TEXT = "¿Tienen stock para esta semana?";

// Chat 1 (+56900000001) is the user's, chat 2 another executive's, chat 3
// unassigned. Chat 1 starts with nothing unread: opening it must not mark it
// read, which refreshes every list and would hide what the channel does.
const inboxData = () => {
  const seed = buildWhatsAppData({
    salesIds: [DEFAULT_USER.id, OTHER_EXECUTIVE],
  });
  return {
    ...seed,
    wa_conversations: seed.wa_conversations.map((conversation) =>
      conversation.id === 1
        ? { ...conversation, unread_count: 0 }
        : conversation,
    ),
  };
};

const renderInbox = async (role: AccessRole = "user") => {
  const crm: { dataProvider?: DataProvider } = {};
  const CaptureDataProvider = () => {
    const dataProvider = useDataProvider();
    useEffect(() => {
      crm.dataProvider = dataProvider;
    }, [dataProvider]);
    return null;
  };
  const screen = await render(
    <StoryWrapper
      authProvider={{ canAccess: async (params) => canAccess(role, params) }}
      data={inboxData()}
    >
      <CaptureDataProvider />
      <WhatsAppPage />
    </StoryWrapper>,
  );
  // What the webhook does behind the app's back (wa_ingest_message): store
  // the message and move its conversation. Nothing on screen asks for it.
  const receive = async (conversationId: Identifier): Promise<WaMessage> => {
    const dataProvider = crm.dataProvider!;
    const sentAt = new Date().toISOString();
    const { data: message } = await dataProvider.create<WaMessage>(
      "wa_messages",
      {
        data: {
          created_at: sentAt,
          conversation_id: conversationId,
          deal_id: null,
          wa_message_id: "DEMO-WA-REALTIME",
          direction: "entrante",
          type: "texto",
          text: NEW_TEXT,
          attachment_path: null,
          status: "entregado",
          from_me_phone: false,
          author_sales_id: null,
          origin: null,
          sent_at: sentAt,
        },
      },
    );
    const { data: conversation } = await dataProvider.getOne<WaConversation>(
      "wa_conversations",
      { id: conversationId },
    );
    await dataProvider.update<WaConversation>("wa_conversations", {
      id: conversationId,
      data: {
        last_message_at: sentAt,
        unread_count: conversation.unread_count + 1,
      },
      previousData: conversation,
    });
    return message;
  };
  return { screen, receive };
};

const openMyChat = async (
  screen: Awaited<ReturnType<typeof renderInbox>>["screen"],
) => {
  await screen
    .getByRole("button", { name: new RegExp(`^\\${MY_CHAT}`) })
    .click();
  const panel = screen.getByRole("region", { name: MY_CHAT });
  await expect
    .element(panel.getByText("Quedo atento a la cotización actualizada."))
    .toBeVisible();
  return panel;
};

describe("Bandeja de WhatsApp en tiempo real", () => {
  beforeEach(() => {
    realtime.reset();
    vi.stubEnv("VITE_SUPABASE_URL", "http://supabase.test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows a message that arrives while its conversation is open", async () => {
    const { screen, receive } = await renderInbox();
    const panel = await openMyChat(screen);

    const incoming = await receive(1);
    expect(panel.getByText(NEW_TEXT).elements()).toHaveLength(0);
    realtime.emit("wa_messages", incoming);

    await expect.element(panel.getByText(NEW_TEXT)).toBeVisible();
  });

  it("updates the unread count and the excerpt of a chat that is not open", async () => {
    const { screen, receive } = await renderInbox();
    await expect
      .element(screen.getByText("Quedo atento a la cotización actualizada."))
      .toBeVisible();

    await receive(1);
    expect(screen.getByLabelText("1 sin leer").elements()).toHaveLength(0);
    realtime.emit("wa_conversations", {});

    await expect.element(screen.getByLabelText("1 sin leer")).toBeVisible();
    await expect.element(screen.getByText(NEW_TEXT)).toBeVisible();
  });

  it("catches up with what it missed when the channels join again", async () => {
    const { screen, receive } = await renderInbox();
    const panel = await openMyChat(screen);

    await receive(1);
    expect(panel.getByText(NEW_TEXT).elements()).toHaveLength(0);
    realtime.rejoin();

    await expect.element(panel.getByText(NEW_TEXT)).toBeVisible();
  });

  it("stops listening to a conversation when it is closed, and to everything when the inbox unmounts", async () => {
    const { screen } = await renderInbox();
    await openMyChat(screen);
    // The inbox and the open conversation.
    await expect.poll(() => realtime.openChannels()).toHaveLength(2);

    await screen.getByRole("tab", { name: "Sin asignar" }).click();
    await expect.poll(() => realtime.openChannels()).toHaveLength(1);

    await screen.unmount();
    await expect.poll(() => realtime.openChannels()).toHaveLength(0);
    expect(realtime.client.removeChannel).toHaveBeenCalledTimes(2);
  });

  it("opens no channel for a reader", async () => {
    const screen = await renderInbox("reader").then((inbox) => inbox.screen);

    await expect
      .element(
        screen.getByText(
          "Tu perfil no tiene acceso a las conversaciones de WhatsApp.",
        ),
      )
      .toBeVisible();
    expect(realtime.openChannels()).toHaveLength(0);
  });

  it("opens no channel in the demo, which runs on FakeRest", async () => {
    vi.stubEnv("VITE_IS_DEMO", "true");
    const { screen } = await renderInbox();

    await openMyChat(screen);

    expect(realtime.openChannels()).toHaveLength(0);
  });
});
