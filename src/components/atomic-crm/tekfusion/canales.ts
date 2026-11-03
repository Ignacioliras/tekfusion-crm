import type { OriginChannel, SendChannel } from "../types";

// Labels of the origin channels of a lead (deals.origin_channel).
export const CANALES_ORIGEN: ReadonlyArray<{
  value: OriginChannel;
  label: string;
}> = [
  { value: "correo", label: "Correo" },
  { value: "formulario", label: "Formulario web" },
  { value: "bot", label: "Bot del sitio" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "manual", label: "Ingreso manual" },
  { value: "migracion", label: "Migración" },
];

// Channels a quote or a follow-up is sent through.
export const CANALES_ENVIO: ReadonlyArray<{
  value: SendChannel;
  label: string;
}> = [
  { value: "correo", label: "Correo" },
  { value: "whatsapp", label: "WhatsApp" },
];

export const labelOf = (
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string => list.find((item) => item.value === value)?.label ?? value ?? "";
