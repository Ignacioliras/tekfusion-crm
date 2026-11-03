// Mirrors the public.alert_type enum (10_tekfusion_tables.sql), in the order
// the panel shows its groups. Labels live in tekfusion.alerts.types.*.
export const ALERT_TYPES = [
  "sin_contacto_24h",
  "sin_contacto_48h",
  "seguimiento_vencido",
  "cliente_respondio",
  "whatsapp_desconectado",
  "por_archivar",
  "sin_asignar",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];
