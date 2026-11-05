import { buildCompany, buildDeal, StoryWrapper } from "@/test/StoryWrapper";
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

// The leads behind the alerts: the text names company, line and elapsed time.
const companies = [
  buildCompany({ id: 1, name: "Minera Ficticia" }),
  buildCompany({ id: 2, name: "Edificaciones Cordillera" }),
];
const deals = [
  buildDeal({
    id: 1,
    name: "Válvulas para planta Antofagasta",
    company_id: 1,
    business_line: "valvulas",
    created_at: hoursAgo(30),
  }),
  buildDeal({
    id: 2,
    name: "Geoceldas para talud norte",
    company_id: 2,
    business_line: "geoceldas",
    created_at: hoursAgo(26.5),
  }),
];

export const Alerts = () => (
  <StoryWrapper data={{ alerts: alertsData, companies, deals }}>
    <AlertsBell />
  </StoryWrapper>
);
