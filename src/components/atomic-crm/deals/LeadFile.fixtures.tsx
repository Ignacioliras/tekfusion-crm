import type { AuthProvider, DataProvider } from "ra-core";
import { ResourceContextProvider } from "ra-core";

import {
  StoryWrapper,
  buildCompany,
  buildContact,
  buildDeal,
  buildSale,
} from "@/test/StoryWrapper";
import type { Deal } from "../types";
import { DealShow } from "./DealShow";

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3600 * 1000).toISOString();

const camila = buildSale({
  id: 1,
  first_name: "Camila",
  last_name: "Rojas",
  administrator: false,
  role: "executive",
  email: "camila@tekfusion-demo.cl",
  user_id: "1",
});

export const leadFileData = (deal: Partial<Deal> = {}) => ({
  companies: [buildCompany({ id: 1, name: "Minera Los Andes" })],
  contacts: [
    buildContact({
      id: 1,
      first_name: "Paula",
      last_name: "Vera",
      company_id: 1,
    }),
  ],
  sales: [buildSale({ first_name: "Andrea", last_name: "Soto" }), camila],
  deals: [
    buildDeal({
      id: 1,
      name: "Válvulas mariposa para planta",
      company_id: 1,
      contact_ids: [1],
      sales_id: 1,
      stage: "cotizado",
      business_line: "valvulas",
      origin_channel: "correo",
      amount: 4500000,
      created_at: hoursAgo(200),
      ...deal,
    }),
  ],
  deal_notes: [
    {
      id: 1,
      deal_id: 1,
      text: "Cliente pide plazo de entrega a Calama.",
      date: hoursAgo(150),
      sales_id: 1,
    },
  ],
  audit_log: [
    {
      id: 1,
      created_at: hoursAgo(120),
      action: "deal.stage_changed",
      actor_sales_id: 1,
      deal_id: 1,
      details: { from: "nuevo", to: "contactado" },
    },
  ],
  quotes: [
    {
      id: 1,
      created_at: hoursAgo(100),
      deal_id: 1,
      version: 1,
      amount: 4500000,
      pdf_path: "deals/1/00000000-0000-4000-8000-000000000001.pdf",
      is_current: true,
      sent_channels: ["correo" as const],
      delivery_status: "entregado" as const,
      sales_id: 1,
    },
  ],
  followups: [
    {
      id: 1,
      created_at: hoursAgo(100),
      deal_id: 1,
      step: 1,
      scheduled_at: hoursAgo(50),
      sent_at: hoursAgo(50),
      channels: ["correo" as const],
      mode: "automatico" as const,
      status: "enviado" as const,
      attempts: 1,
    },
  ],
  alerts: [
    {
      id: 1,
      created_at: hoursAgo(10),
      type: "cliente_respondio",
      recipient_sales_id: 1,
      deal_id: 1,
      message: "El cliente respondió por correo",
    },
  ],
  lost_reasons: [{ id: 1, name: "Precio", active: true, position: 1 }],
});

/** Roles as canAccess.ts sees them: manager (everything), executive (no users), reader (read only). */
export const executiveAccess: Partial<AuthProvider> = {
  canAccess: async ({ resource }) => resource !== "sales",
};
export const readerAccess: Partial<AuthProvider> = {
  canAccess: async ({ action }) => ["list", "show", "export"].includes(action),
};

export const LeadFile = ({
  deal,
  authProvider,
  dataProvider,
}: {
  deal?: Partial<Deal>;
  authProvider?: Partial<AuthProvider>;
  dataProvider?: Partial<DataProvider>;
}) => (
  <StoryWrapper
    data={leadFileData(deal)}
    authProvider={authProvider}
    dataProvider={dataProvider}
  >
    <ResourceContextProvider value="deals">
      <DealShow open id="1" />
    </ResourceContextProvider>
  </StoryWrapper>
);
