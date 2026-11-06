import type { Identifier } from "ra-core";

import type { WaConversation, WaMessage } from "../../../types";
import type { Db } from "./types";

type SeedMessage = Pick<
  WaMessage,
  | "direction"
  | "type"
  | "text"
  | "attachment_path"
  | "status"
  | "from_me_phone"
  | "origin"
> & { minutesAgo: number };

// Same conversations and messages as supabase/seed.sql (T8): one chat per
// executive and one unassigned, with every message type and status.
const SEED: Array<{ phone: string; messages: SeedMessage[] }> = [
  {
    phone: "+56900000001",
    messages: [
      {
        direction: "entrante",
        type: "texto",
        text: "Hola, ¿me confirman el plazo de entrega de las válvulas?",
        attachment_path: null,
        status: "leido",
        from_me_phone: false,
        origin: null,
        minutesAgo: 1500,
      },
      {
        direction: "saliente",
        type: "texto",
        text: "Hola, el plazo es de 10 días hábiles desde la orden de compra.",
        attachment_path: null,
        status: "leido",
        from_me_phone: false,
        origin: "crm",
        minutesAgo: 1490,
      },
      {
        direction: "saliente",
        type: "documento",
        text: "Le adjunto la ficha técnica.",
        attachment_path: "whatsapp/demo/ficha-tecnica-demo.pdf",
        status: "entregado",
        from_me_phone: false,
        origin: "crm",
        minutesAgo: 1485,
      },
      {
        direction: "entrante",
        type: "audio",
        text: null,
        attachment_path: "whatsapp/demo/nota-de-voz-demo.ogg",
        status: "entregado",
        from_me_phone: false,
        origin: null,
        minutesAgo: 90,
      },
      {
        direction: "entrante",
        type: "texto",
        text: "Quedo atento a la cotización actualizada.",
        attachment_path: null,
        status: "entregado",
        from_me_phone: false,
        origin: null,
        minutesAgo: 60,
      },
    ],
  },
  {
    phone: "+56900000002",
    messages: [
      {
        direction: "saliente",
        type: "texto",
        text: "Buenos días, le escribo por su consulta de tubería HDPE.",
        attachment_path: null,
        status: "leido",
        from_me_phone: false,
        origin: "seguimiento",
        minutesAgo: 2900,
      },
      {
        direction: "entrante",
        type: "texto",
        text: "Gracias, necesitamos 300 m en 250 mm.",
        attachment_path: null,
        status: "leido",
        from_me_phone: false,
        origin: null,
        minutesAgo: 2880,
      },
      {
        direction: "saliente",
        type: "texto",
        text: "Perfecto, se lo cotizo hoy mismo.",
        attachment_path: null,
        status: "enviado",
        from_me_phone: true,
        origin: "telefono",
        minutesAgo: 2870,
      },
      {
        direction: "saliente",
        type: "imagen",
        text: "Foto de referencia del fitting.",
        attachment_path: "whatsapp/demo/fitting-demo.jpg",
        status: "fallido",
        from_me_phone: false,
        origin: "crm",
        minutesAgo: 2860,
      },
    ],
  },
  {
    phone: "+56900000003",
    messages: [
      {
        direction: "entrante",
        type: "texto",
        text: "Hola, ¿venden geoceldas para un camino de faena?",
        attachment_path: null,
        status: "entregado",
        from_me_phone: false,
        origin: null,
        minutesAgo: 300,
      },
      {
        direction: "entrante",
        type: "texto",
        text: "Serían unos 2.000 m2.",
        attachment_path: null,
        status: "entregado",
        from_me_phone: false,
        origin: null,
        minutesAgo: 295,
      },
      {
        direction: "entrante",
        type: "imagen",
        text: "Así está el camino hoy.",
        attachment_path: "whatsapp/demo/camino-demo.jpg",
        status: "entregado",
        from_me_phone: false,
        origin: null,
        minutesAgo: 290,
      },
      {
        direction: "entrante",
        type: "video",
        text: null,
        attachment_path: "whatsapp/demo/recorrido-demo.mp4",
        status: "entregado",
        from_me_phone: false,
        origin: null,
        minutesAgo: 285,
      },
    ],
  },
];

export interface WhatsAppSeedOptions {
  /** Owners of the first two conversations; the third stays unassigned. */
  salesIds: [Identifier, Identifier];
  /** Contacts of the first two conversations (the third is an unknown number). */
  contactIds?: [Identifier | null, Identifier | null];
  now?: Date;
}

export const buildWhatsAppData = ({
  salesIds,
  contactIds = [null, null],
  now = new Date(),
}: WhatsAppSeedOptions): Pick<Db, "wa_conversations" | "wa_messages"> => {
  const at = (minutesAgo: number) =>
    new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const wa_messages: WaMessage[] = [];

  const wa_conversations = SEED.map(({ phone, messages }, index) => {
    const id = index + 1;
    const sales_id = salesIds[index] ?? null;
    messages.forEach((message) => {
      const n = wa_messages.length + 1;
      wa_messages.push({
        id: n,
        created_at: at(message.minutesAgo),
        conversation_id: id,
        deal_id: null,
        wa_message_id: `DEMO-WA-${String(n).padStart(4, "0")}`,
        direction: message.direction,
        type: message.type,
        text: message.text,
        attachment_path: message.attachment_path,
        status: message.status,
        from_me_phone: message.from_me_phone,
        author_sales_id: message.origin === "crm" ? sales_id : null,
        origin: message.origin,
        sent_at: at(message.minutesAgo),
      });
    });
    const conversation: WaConversation = {
      id,
      created_at: at(Math.max(...messages.map((m) => m.minutesAgo))),
      phone,
      contact_id: contactIds[index] ?? null,
      active_deal_id: null,
      sales_id,
      last_message_at: at(Math.min(...messages.map((m) => m.minutesAgo))),
      unread_count: messages.filter(
        (m) => m.direction === "entrante" && m.status !== "leido",
      ).length,
      archived: false,
    };
    return conversation;
  });

  return { wa_conversations, wa_messages };
};

// Demo: the first two generated executives own a chat each.
export const generateWhatsApp = (db: Db) =>
  buildWhatsAppData({
    salesIds: [1, 2],
    contactIds: [db.contacts[0]?.id ?? null, db.contacts[1]?.id ?? null],
  });
