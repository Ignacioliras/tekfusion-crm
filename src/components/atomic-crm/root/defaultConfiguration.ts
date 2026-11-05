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

export const defaultCompanySectors = [
  { value: "communication-services", label: "Telecomunicaciones" },
  { value: "consumer-discretionary", label: "Consumo discrecional" },
  { value: "consumer-staples", label: "Consumo básico" },
  { value: "energy", label: "Energía" },
  { value: "financials", label: "Finanzas" },
  { value: "health-care", label: "Salud" },
  { value: "industrials", label: "Industria" },
  { value: "information-technology", label: "Tecnologías de la información" },
  { value: "materials", label: "Materiales" },
  { value: "real-estate", label: "Inmobiliario" },
  { value: "utilities", label: "Servicios básicos" },
];

export const defaultDealStages = ETAPAS.map(({ value, label }) => ({
  value,
  label,
}));

export const defaultDealPipelineStatuses: string[] = [...ETAPAS_CERRADAS];

export const defaultDealCategories = [
  { value: "other", label: "Other" },
  { value: "copywriting", label: "Copywriting" },
  { value: "print-project", label: "Print project" },
  { value: "ui-design", label: "UI Design" },
  { value: "website-design", label: "Website design" },
];

export const defaultNoteStatuses = [
  { value: "cold", label: "Frío", color: "#7dbde8" },
  { value: "warm", label: "Tibio", color: "#e8cb7d" },
  { value: "hot", label: "Caliente", color: "#e88b7d" },
  { value: "in-contract", label: "En contrato", color: "#a4e87d" },
];

export const defaultTaskTypes = [
  { value: "none", label: "Ninguno" },
  { value: "email", label: "Correo" },
  { value: "demo", label: "Demo" },
  { value: "lunch", label: "Almuerzo" },
  { value: "meeting", label: "Reunión" },
  { value: "follow-up", label: "Seguimiento" },
  { value: "thank-you", label: "Agradecimiento" },
  { value: "ship", label: "Despacho" },
  { value: "call", label: "Llamada" },
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
