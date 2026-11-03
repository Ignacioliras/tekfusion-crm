import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Contacts.
export const contactsMessages: PartialCrmMessages = {
  resources: {
    contacts: {
      name: "Contacto |||| Contactos",
      forcedCaseName: "Contacto",
      field_categories: {
        background_info: "Antecedentes",
        identity: "Identidad",
        misc: "Otros",
        personal_info: "Datos personales",
        position: "Cargo",
      },
      fields: {
        first_name: "Nombre",
        last_name: "Apellido",
        last_seen: "Último contacto",
        title: "Cargo",
        company_id: "Empresa",
        email_jsonb: "Correos",
        email: "Correo",
        phone_jsonb: "Teléfonos",
        phone_number: "Teléfono",
        linkedin_url: "URL de LinkedIn",
        background: "Antecedentes (biografía, cómo se conocieron, etc.)",
        has_newsletter: "Recibe newsletter",
        sales_id: "Ejecutivo",
      },
      action: {
        add: "Agregar contacto",
        add_first: "Agrega tu primer contacto",
        create: "Crear contacto",
        edit: "Editar contacto",
        export_vcard: "Exportar a vCard",
        new: "Nuevo contacto",
        show: "Ver contacto",
      },
      autocomplete: {
        create_item: "Crear %{item}",
        create_label: "Escribe para crear un contacto nuevo",
      },
      background: {
        last_activity_on: "Última actividad el %{date}",
        added_on: "Agregado el %{date}",
        followed_by: "Seguido por %{name}",
        followed_by_you: "Lo sigues tú",
        status_none: "Ninguno",
      },
      position_at: "%{title} en",
      position_at_company: "%{title} en %{company}",
      empty: {
        description: "Parece que tu lista de contactos está vacía.",
        title: "No se encontraron contactos",
      },
      import: {
        title: "Importar contactos",
      },
      inputs: {
        genders: {
          male: "Él",
          female: "Ella",
          nonbinary: "Elle",
        },
        personal_info_types: {
          work: "Trabajo",
          home: "Personal",
          other: "Otro",
        },
      },
      list: {
        error_loading: "Error al cargar los contactos",
      },
      show: {
        error_loading: "Error al cargar el contacto",
      },
      bulk_tag: {
        action: "Etiquetar",
        back: "Volver a las etiquetas",
        create_description:
          "Crea una etiqueta nueva y aplícala a los contactos seleccionados.",
        description:
          "Elige una etiqueta existente o crea una nueva para los contactos seleccionados.",
        empty:
          "Aún no hay etiquetas. Crea una para etiquetar los contactos seleccionados.",
        error: "No se pudo agregar la etiqueta a los contactos",
        removed:
          "Etiqueta quitada de %{smart_count} contacto |||| Etiqueta quitada de %{smart_count} contactos",
        success:
          "Etiqueta agregada a %{smart_count} contacto |||| Etiqueta agregada a %{smart_count} contactos",
        title: "Agregar etiqueta a contactos",
      },
      merge: {
        action: "Fusionar con otro contacto",
        confirm: "Fusionar contactos",
        current_contact: "Contacto actual (se eliminará)",
        description: "Fusiona este contacto con otro.",
        error: "No se pudieron fusionar los contactos",
        merging: "Fusionando...",
        no_additional_data: "No hay datos adicionales para fusionar",
        select_target: "Selecciona un contacto con el cual fusionar",
        success: "Contactos fusionados",
        target_contact: "Contacto de destino (se conserva)",
        title: "Fusionar contacto",
        warning_description:
          "Todos los datos pasarán al segundo contacto. Esta acción no se puede deshacer.",
        warning_title: "Atención: operación destructiva",
        what_will_be_merged: "Qué se fusionará:",
      },
      filters: {
        before_last_month: "Antes del mes pasado",
        before_this_month: "Antes de este mes",
        before_this_week: "Antes de esta semana",
        managed_by_me: "A mi cargo",
        search: "Buscar nombre, empresa...",
        this_week: "Esta semana",
        today: "Hoy",
        tags: "Etiquetas",
        tasks: "Tareas",
      },
      hot: {
        empty_change_status:
          'Cambia el estado de un contacto agregándole una nota y haciendo clic en "ver opciones".',
        empty_hint: 'Aquí aparecerán los contactos con estado "caliente".',
        title: "Contactos calientes",
      },
    },
  },
};
