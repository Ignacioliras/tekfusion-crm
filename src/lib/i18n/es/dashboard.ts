import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Dashboard.
export const dashboardMessages: PartialCrmMessages = {
  crm: {
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
