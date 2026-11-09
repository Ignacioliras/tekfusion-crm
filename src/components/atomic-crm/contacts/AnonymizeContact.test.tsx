import { useDataProvider, type DataProvider } from "ra-core";
import { useEffect } from "react";
import { render } from "vitest-browser-react";
import { canAccess } from "@/components/atomic-crm/providers/commons/canAccess";
import type { Db } from "@/components/atomic-crm/providers/fakerest/dataGenerator/types";
import type {
  Followup,
  WaConversation,
  WaMessage,
} from "@/components/atomic-crm/types";
import { buildContact, buildDeal, StoryWrapper } from "@/test/StoryWrapper";
import { ContactShow } from "./ContactShow";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const EMAIL = "ana.prueba@ejemplo.example";

const contact = buildContact({
  id: 1,
  first_name: "Ana",
  last_name: "Prueba",
  email_jsonb: [{ email: EMAIL, type: "Work" }],
});
const other = buildContact({ id: 2, first_name: "Beto", last_name: "Prueba" });

const followup = (id: number, deal_id: number): Followup => ({
  id,
  created_at: "2026-11-01T10:00:00.000Z",
  deal_id,
  step: 1,
  scheduled_at: "2026-11-20T13:00:00.000Z",
  channels: ["whatsapp"],
  mode: "automatico",
  status: "pendiente",
  attempts: 0,
});

// Ana alone on lead 1, shared with Beto on lead 2; one WhatsApp chat each.
const withLeadsAndChats: Partial<Db> = {
  contacts: [contact, other],
  deals: [
    buildDeal({ id: 1, name: "Lead solo de Ana", contact_ids: [1] }),
    buildDeal({ id: 2, name: "Lead de Ana y Beto", contact_ids: [1, 2] }),
  ],
  followups: [followup(1, 1), followup(2, 2)],
  wa_conversations: [
    { id: 1, phone: "+56900003101", contact_id: 1 },
    { id: 2, phone: "+56900003102", contact_id: 2 },
  ] as WaConversation[],
  wa_messages: [
    { id: 1, conversation_id: 1, text: "Hola, soy Ana Prueba" },
    { id: 2, conversation_id: 2, text: "Hola, soy Beto" },
  ] as WaMessage[],
};

const renderContact = (
  role?: "user" | "reader",
  data: Partial<Db> = { contacts: [contact] },
  onDataProvider?: (dataProvider: DataProvider) => void,
) => {
  const CaptureDataProvider = () => {
    const dataProvider = useDataProvider();
    useEffect(() => onDataProvider?.(dataProvider), [dataProvider]);
    return null;
  };
  return render(
    <StoryWrapper
      data={{ wa_conversations: [], wa_messages: [], ...data }}
      authProvider={
        role
          ? { canAccess: async (params) => canAccess(role, params) }
          : undefined
      }
    >
      <CaptureDataProvider />
      <ContactShow resource="contacts" id={1} />
    </StoryWrapper>,
  );
};

describe("Anonimizar contacto (RF-17)", () => {
  it("anonymizes the contact once a manager confirms the warning", async () => {
    const screen = await renderContact();
    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();

    await screen.getByRole("button", { name: "Anonimizar contacto" }).click();
    await expect
      .element(screen.getByText(/Esta acción no se puede deshacer/))
      .toBeVisible();
    await screen.getByRole("button", { name: "Sí, anonimizar" }).click();

    await expect
      .element(screen.getByText(/Contacto anonimizado #1/).first())
      .toBeVisible();
    await expect.element(screen.getByText(EMAIL)).not.toBeInTheDocument();
    await expect
      .element(screen.getByText(/Ana Prueba/))
      .not.toBeInTheDocument();
    // Already anonymized: the button goes away.
    await expect
      .element(screen.getByRole("button", { name: "Anonimizar contacto" }))
      .not.toBeInTheDocument();
  });

  it("cancels the pending follow-ups of its own leads and strips its WhatsApp chat", async () => {
    let dataProvider: DataProvider | undefined;
    const screen = await renderContact(undefined, withLeadsAndChats, (dp) => {
      dataProvider = dp;
    });
    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();

    await screen.getByRole("button", { name: "Anonimizar contacto" }).click();
    await screen.getByRole("button", { name: "Sí, anonimizar" }).click();
    await expect
      .element(screen.getByText(/Contacto anonimizado #1/).first())
      .toBeVisible();

    const { data: followups } = await dataProvider!.getList<Followup>(
      "followups",
      {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      },
    );
    expect(followups.map((f) => [f.status, f.cancel_reason ?? null])).toEqual([
      ["cancelado", "anonimizado"],
      ["pendiente", null],
    ]);
    const { data: chats } = await dataProvider!.getList<WaConversation>(
      "wa_conversations",
      {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      },
    );
    expect(chats.map((c) => c.phone)).toEqual(["anon-1", "+56900003102"]);
    const { data: messages } = await dataProvider!.getList<WaMessage>(
      "wa_messages",
      {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      },
    );
    expect(messages.map((m) => m.text)).toEqual([null, "Hola, soy Beto"]);
  });

  it("hides the button once the contact is anonymized", async () => {
    const screen = await renderContact(undefined, {
      contacts: [
        buildContact({
          id: 1,
          first_name: "Contacto",
          last_name: "anonimizado #1",
          email_jsonb: [],
          anonymized_at: "2026-11-01T10:00:00.000Z",
        }),
      ],
    });

    await expect
      .element(screen.getByText(/Contacto anonimizado #1/).first())
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Anonimizar contacto" }))
      .not.toBeInTheDocument();
  });

  it("hides the button from an executive", async () => {
    const screen = await renderContact("user");

    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Anonimizar contacto" }))
      .not.toBeInTheDocument();
  });

  it("leaves the contact untouched when the manager cancels", async () => {
    const screen = await renderContact();

    await screen.getByRole("button", { name: "Anonimizar contacto" }).click();
    await screen.getByRole("button", { name: "Cancelar" }).click();

    await expect
      .element(screen.getByText(/Esta acción no se puede deshacer/))
      .not.toBeInTheDocument();
    await expect.element(screen.getByText(EMAIL).first()).toBeVisible();
    await expect
      .element(screen.getByText(/Contacto anonimizado #1/))
      .not.toBeInTheDocument();
  });
});
