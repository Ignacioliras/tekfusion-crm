import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Dashboard and its activity log.
export const dashboardMessages: PartialCrmMessages = {
  crm: {
    activity: {
      added_company: "%{name} agregó la empresa",
      you_added_company: "Agregaste la empresa",
      added_contact: "%{name} agregó a",
      you_added_contact: "Agregaste a",
      added_note: "%{name} agregó una nota sobre",
      you_added_note: "Agregaste una nota sobre",
      added_note_about_deal: "%{name} agregó una nota sobre el lead",
      you_added_note_about_deal: "Agregaste una nota sobre el lead",
      added_deal: "%{name} agregó el lead",
      you_added_deal: "Agregaste el lead",
      at_company: "en",
      to: "a",
      load_more: "Cargar más actividad",
    },
    dashboard: {
      deals_chart: "Ingresos proyectados de leads",
      deals_pipeline: "Pipeline de leads",
      latest_activity: "Última actividad",
      latest_activity_error: "Error al cargar la última actividad",
      latest_notes: "Mis últimas notas",
      latest_notes_added_ago: "agregada %{timeAgo}",
      stepper: {
        install: "Instalar el CRM",
        progress: "%{step}/3 listos",
        whats_next: "¿Qué sigue?",
      },
      upcoming_tasks: "Próximas tareas",
    },
  },
};
