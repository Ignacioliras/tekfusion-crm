import { ETAPAS, ETAPAS_CERRADAS } from "../tekfusion/estados";
import type { ConfigurationContextValue } from "./ConfigurationContext";
// Import the logos as module assets so Vite resolves their URL relative to the
// JS chunk (import.meta.url), not the current route. A plain "./logos/..." path
// breaks on nested routes and under a deployment sub-path.
import darkModeLogo from "./logos/logo_atomic_crm_dark.svg";
import lightModeLogo from "./logos/logo_atomic_crm_light.svg";

export const defaultDarkModeLogo = darkModeLogo;
export const defaultLightModeLogo = lightModeLogo;

export const defaultCurrency = "CLP";

export const defaultTitle = "CRM TekFusion";

// TekFusion's clients (B2B: valves, pipes, geocells). To confirm with
// TekFusion (docs/11); editable in Configuración.
export const defaultCompanySectors = [
  { value: "mineria", label: "Minería" },
  { value: "construccion", label: "Construcción y obras civiles" },
  { value: "agua", label: "Agua y saneamiento" },
  { value: "agro", label: "Agrícola y riego" },
  { value: "industria", label: "Industria" },
  { value: "energia", label: "Energía" },
  { value: "publico", label: "Sector público" },
  { value: "otro", label: "Otro" },
];

export const defaultDealStages = ETAPAS.map(({ value, label }) => ({
  value,
  label,
}));

export const defaultDealPipelineStatuses: string[] = [...ETAPAS_CERRADAS];

// Atomic's deal categories: TekFusion classifies leads by business line
// instead. Empty hides the field, the filter and the settings block.
export const defaultDealCategories: { value: string; label: string }[] = [];

export const defaultNoteStatuses = [
  { value: "cold", label: "Frío", color: "#7dbde8" },
  { value: "warm", label: "Tibio", color: "#e8cb7d" },
  { value: "hot", label: "Caliente", color: "#e88b7d" },
  { value: "in-contract", label: "En contrato", color: "#a4e87d" },
];

export const defaultTaskTypes = [
  { value: "none", label: "Ninguno" },
  { value: "call", label: "Llamada" },
  { value: "email", label: "Correo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Reunión" },
  { value: "visit", label: "Visita a terreno" },
  { value: "follow-up", label: "Seguimiento" },
  { value: "thank-you", label: "Agradecimiento" },
  { value: "ship", label: "Despacho" },
];

// Must match the coalesce default of public.send_quote.
export const defaultFollowupCadenceDays = [2, 5, 10];

// docs/03-reglas-negocio.md: Monday to Friday, 09:00–18:00 America/Santiago.
export const defaultBusinessHours = {
  days: [1, 2, 3, 4, 5],
  from: "09:00",
  to: "18:00",
};

export const defaultWeeklyReport = {
  day: 1,
  time: "08:00",
  recipients: [] as string[],
};

export const defaultConfiguration: ConfigurationContextValue = {
  followupCadenceDays: defaultFollowupCadenceDays,
  businessHours: defaultBusinessHours,
  billingEmail: "",
  weeklyReport: defaultWeeklyReport,
  companySectors: defaultCompanySectors,
  currency: defaultCurrency,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
};
