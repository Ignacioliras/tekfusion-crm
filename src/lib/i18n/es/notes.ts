import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Notes.
export const notesMessages: PartialCrmMessages = {
  resources: {
    notes: {
      name: "Nota |||| Notas",
      forcedCaseName: "Nota",
      fields: {
        status: "Estado",
        date: "Fecha",
        attachments: "Adjuntos",
        contact_id: "Contacto",
        deal_id: "Lead",
      },
      action: {
        add: "Agregar nota",
        add_first: "Agrega tu primera nota",
        delete: "Eliminar nota",
        edit: "Editar nota",
        update: "Actualizar nota",
        add_this: "Agregar esta nota",
      },
      sheet: {
        create: "Crear nota",
        create_for: "Crear nota para %{name}",
        edit: "Editar nota",
        edit_for: "Editar nota de %{name}",
      },
      deleted: "Nota eliminada",
      empty: "Aún no hay notas",
      author_added: "%{name} agregó una nota",
      you_added: "Agregaste una nota",
      me: "Yo",
      list: {
        error_loading: "Error al cargar las notas",
      },
      note_for_contact: "Nota para %{name}",
      added: "Nota agregada",
      inputs: {
        add_note: "Agregar una nota",
        options_hint: "(adjuntar archivos o cambiar detalles)",
        show_options: "Ver opciones",
      },
      actions: {
        attach_document: "Adjuntar documento",
      },
      validation: {
        note_or_attachment_required: "Se necesita una nota o un adjunto",
      },
    },
  },
};
