import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Global search.
export const searchMessages: PartialCrmMessages = {
  crm: {
    search: {
      title: "Buscar",
      placeholder: "Buscar contactos, empresas, leads, tareas y notas...",
      hint: "Escribe al menos %{min} caracteres para buscar",
      empty: "No se encontraron resultados",
      error: "La búsqueda no está disponible ahora. Inténtalo de nuevo.",
      untitled_result: "(sin título)",
      show_more: "Ver más",
      groups: {
        contacts: "Contactos",
        companies: "Empresas",
        deals: "Leads",
        tasks: "Tareas",
        contact_notes: "Notas de contactos",
        deal_notes: "Notas de leads",
      },
    },
  },
};
