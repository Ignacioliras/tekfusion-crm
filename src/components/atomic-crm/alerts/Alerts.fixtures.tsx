import { StoryWrapper } from "@/test/StoryWrapper";
import { DEFAULT_USER } from "../providers/fakerest/authProvider";
import type { Alert } from "../types";
import { AlertsBell } from "./AlertsBell";

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3600 * 1000).toISOString();

const me = DEFAULT_USER.id;
const otherExecutive = 99;

// Three unread alerts for the current user, in two groups, plus one already
// read and one addressed to someone else: neither may count.
const alertsData: Alert[] = [
  {
    id: 1,
    created_at: hoursAgo(30),
    type: "sin_contacto_24h",
    recipient_sales_id: me,
    deal_id: 1,
    message: "Lead Válvulas para planta Antofagasta sin contacto",
  },
  {
    id: 2,
    created_at: hoursAgo(26),
    type: "sin_contacto_24h",
    recipient_sales_id: me,
    deal_id: 2,
    message: "Lead Geoceldas para talud norte sin contacto",
  },
  {
    id: 3,
    created_at: hoursAgo(2),
    type: "whatsapp_desconectado",
    recipient_sales_id: me,
    deal_id: null,
    message: "El WhatsApp corporativo se desconectó",
  },
  {
    id: 4,
    created_at: hoursAgo(40),
    type: "cliente_respondio",
    recipient_sales_id: me,
    deal_id: 3,
    message: "Ya leída: el cliente respondió",
    read_at: hoursAgo(39),
  },
  {
    id: 5,
    created_at: hoursAgo(5),
    type: "seguimiento_vencido",
    recipient_sales_id: otherExecutive,
    deal_id: 4,
    message: "Alerta de otro ejecutivo",
  },
];

export const Alerts = () => (
  <StoryWrapper data={{ alerts: alertsData }}>
    <AlertsBell />
  </StoryWrapper>
);
