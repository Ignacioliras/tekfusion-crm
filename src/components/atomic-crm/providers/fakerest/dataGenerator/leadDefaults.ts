import type { Template } from "../../../types";

// Same fictitious defaults as supabase/seed.sql.
export const DEFAULT_LOST_REASONS = [
  "Precio",
  "Competencia",
  "Sin respuesta",
  "Sin presupuesto",
  "Otro",
];

export const DEFAULT_TEMPLATES: Array<Omit<Template, "id" | "active">> = [
  {
    name: "Seguimiento 1 · correo",
    channel: "correo",
    subject: "Cotización {{producto}} · TekFusion",
    body: "Hola {{nombre}}, le escribo para saber si pudo revisar la cotización de {{producto}} para {{empresa}}. Quedo atento a sus comentarios. {{ejecutivo}}",
  },
  {
    name: "Seguimiento 1 · WhatsApp",
    channel: "whatsapp",
    subject: null,
    body: "Hola {{nombre}}, ¿alcanzó a revisar la cotización de {{producto}}? Cualquier duda me escribe por aquí. {{ejecutivo}}",
  },
];
