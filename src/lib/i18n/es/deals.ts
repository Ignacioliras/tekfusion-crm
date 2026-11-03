import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Deals, called "leads" in the UI.
export const dealsMessages: PartialCrmMessages = {
  resources: {
    deals: {
      name: "Lead |||| Leads",
      fields: {
        name: "Nombre",
        description: "Descripción",
        company_id: "Empresa",
        contact_ids: "Contactos",
        categories: "Categorías",
        amount: "Monto",
        expected_closing_date: "Fecha estimada de cierre",
        stage: "Etapa",
        sales_id: "Ejecutivo",
      },
      action: {
        back_to_deal: "Volver al lead",
        create: "Crear lead",
        new: "Nuevo lead",
      },
      field_categories: {
        misc: "Otros",
      },
      filters: {
        only_mine: "Solo mis leads",
      },
      archived: {
        action: "Archivar",
        error: "Error: el lead no se archivó",
        list_title: "Leads archivados",
        success: "Lead archivado",
        title: "Lead archivado",
        view: "Ver leads archivados",
      },
      inputs: {
        linked_to: "Asociado a",
      },
      unarchived: {
        action: "Devolver al tablero",
        error: "Error: el lead no se desarchivó",
        success: "Lead desarchivado",
      },
      updated: "Lead actualizado",
      empty: {
        before_create: "antes de crear un lead.",
        description: "Parece que tu lista de leads está vacía.",
        title: "No se encontraron leads",
      },
      import: {
        title: "Importar leads",
      },
      invalid_date: "Fecha inválida",
    },
  },
};
