import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Tasks.
export const tasksMessages: PartialCrmMessages = {
  resources: {
    tasks: {
      name: "Tarea |||| Tareas",
      forcedCaseName: "Tarea",
      fields: {
        text: "Descripción",
        due_date: "Fecha límite",
        type: "Tipo",
        contact_id: "Contacto",
        due_short: "vence",
      },
      action: {
        add: "Agregar tarea",
        create: "Crear tarea",
        edit: "Editar tarea",
      },
      actions: {
        postpone_next_week: "Posponer a la próxima semana",
        postpone_tomorrow: "Posponer para mañana",
        title: "acciones de la tarea",
      },
      added: "Tarea agregada",
      deleted: "Tarea eliminada",
      dialog: {
        create: "Crear tarea",
        create_for: "Crear tarea para %{name}",
      },
      sheet: {
        edit: "Editar tarea",
        edit_for: "Editar tarea de %{name}",
      },
      empty: "Aún no hay tareas",
      empty_list_hint: "Aquí aparecerán las tareas que agregues a tus contactos.",
      filters: {
        later: "Más adelante",
        overdue: "Atrasadas",
        this_week: "Esta semana",
        today: "Hoy",
        tomorrow: "Mañana",
        with_pending: "Con tareas pendientes",
      },
      regarding_contact: "(Ref.: %{name})",
      updated: "Tarea actualizada",
    },
  },
};
