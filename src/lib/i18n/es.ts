import type { TranslationMessages } from "ra-core";
import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Spanish (Chile) translation of Atomic's own keys (englishCrmMessages.ts).
// Typed against the English catalog, so a misspelled key fails typecheck;
// missing keys fall back to English.
// Vocabulary: a deal is a "lead"; a sale (account manager) is an "ejecutivo".
export const spanishCrmMessages: PartialCrmMessages = {
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
    // Only the names and the keys shown on the dashboard and settings;
    // the rest of these resources is translated with their own screens.
    companies: {
      name: "Empresa |||| Empresas",
      forcedCaseName: "Empresa",
    },
    notes: {
      name: "Nota |||| Notas",
      forcedCaseName: "Nota",
      action: {
        add: "Agregar nota",
        add_first: "Agrega tu primera nota",
      },
      stepper: {
        hint: "Entra a la ficha de un contacto y agrega una nota",
      },
    },
    sales: {
      name: "Usuario |||| Usuarios",
      fields: {
        first_name: "Nombre",
        last_name: "Apellido",
        email: "Correo",
        secondary_email: "Correo secundario",
        secondary_emails: "Correos secundarios",
        administrator: "Administrador",
        disabled: "Desactivado",
      },
      create: {
        error: "Ocurrió un error al crear el usuario.",
        success:
          "Usuario creado. Pronto recibirá un correo para definir su contraseña.",
        title: "Crear usuario",
      },
      edit: {
        error: "Ocurrió un error. Inténtalo de nuevo.",
        record_not_found: "Registro no encontrado",
        success: "Usuario actualizado",
        title: "Editar a %{name}",
      },
      action: {
        new: "Nuevo usuario",
      },
    },
    tasks: {
      name: "Tarea |||| Tareas",
      forcedCaseName: "Tarea",
    },
    tags: {
      name: "Etiqueta |||| Etiquetas",
      empty: "Aún no hay etiquetas.",
    },
  },
  crm: {
    language: "Idioma",
    common: {
      account_manager: "Ejecutivo",
      activity: "Actividad",
      added: "agregado",
      details: "Detalles",
      last_activity_with_date: "última actividad %{date}",
      load_more: "Cargar más",
      misc: "Otros",
      past: "Pasadas",
      read_more: "Leer más",
      retry: "Reintentar",
      show_less: "Ver menos",
      copied: "¡Copiado!",
      copy: "Copiar",
      loading: "Cargando...",
      me: "Yo",
      task_count: "%{smart_count} tarea |||| %{smart_count} tareas",
    },
    changelog: {
      title: "Novedades",
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
    header: {
      import_data: "Importar desde JSON",
    },
    settings: {
      about: "Acerca de",
      companies: {
        sectors: "Sectores",
      },
      dark_mode_logo: "Logo en modo oscuro",
      deals: {
        categories: "Categorías",
        currency: "Moneda",
        pipeline_help: "Elige qué etapas cuentan como leads en el pipeline.",
        pipeline_statuses: "Etapas del pipeline",
        stages: "Etapas",
      },
      light_mode_logo: "Logo en modo claro",
      notes: {
        statuses: "Estados",
      },
      reset_defaults: "Restablecer valores por defecto",
      save_error: "No se pudo guardar la configuración",
      saved: "Configuración guardada",
      saving: "Guardando...",
      tasks: {
        types: "Tipos",
      },
      preferences: "Preferencias",
      title: "Configuración",
      app_title: "Nombre de la aplicación",
      sections: {
        branding: "Marca",
      },
      validation: {
        duplicate: "%{display_name} duplicadas: %{items}",
        in_use:
          "No se pueden quitar %{display_name} que todavía usan leads: %{items}",
        validating: "Validando…",
        entities: {
          categories: "categorías",
          stages: "etapas",
        },
      },
    },
    theme: {
      dark: "Oscuro",
      label: "Tema",
      light: "Claro",
      system: "Sistema",
    },
    navigation: {
      label: "Navegación del CRM",
    },
    profile: {
      add_secondary_email: "Agregar un correo",
      email_taken: "%{email} ya lo usa otro usuario",
      no_secondary_emails: "Ninguno",
      secondary_email_invalid: "%{email} no es un correo válido",
      secondary_email_is_primary: "%{email} ya es tu correo principal",
      secondary_email_taken: "%{email} ya lo usa otro usuario",
      too_many_secondary_emails:
        "No puedes agregar más de 10 correos secundarios",
      secondary_emails_help:
        "Otras direcciones desde las que envías correos. Deja una vacía para quitarla.",
      inbound: {
        description:
          "Puedes empezar a enviar correos a la dirección de entrada de tu servidor, por ejemplo agregándola en el campo %{field}. El CRM procesará los correos y agregará notas a los contactos correspondientes.",
        title: "Correo entrante",
      },
      mcp: {
        title: "Servidor MCP",
        description:
          "Usa esta URL para conectar tu asistente de IA a los datos del CRM mediante el Model Context Protocol (MCP).",
      },
      password: {
        change: "Cambiar contraseña",
      },
      password_reset_sent:
        "Te enviamos un correo para restablecer tu contraseña",
      record_not_found: "Registro no encontrado",
      title: "Perfil",
      updated: "Tu perfil fue actualizado",
      update_error: "Ocurrió un error. Inténtalo de nuevo",
    },
    credits: {
      title: "Créditos",
      developed_by: "Este sistema fue desarrollado por %{developer} para %{client}.",
      whatsapp_uses: "La mensajería de WhatsApp de este sistema usa",
      whatsapp_license:
        ", distribuida bajo licencia Apache 2.0 con condición de atribución.",
      third_party: "Componentes de terceros",
      evolution_license: "Apache 2.0 (con atribución)",
    },
  },
};

// Spanish (Chile) translation of ra-language-english (same key structure).
export const spanishMessages: TranslationMessages = {
  ra: {
    action: {
      add_filter: "Agregar filtro",
      add: "Agregar",
      back: "Volver",
      bulk_actions:
        "1 elemento seleccionado |||| %{smart_count} elementos seleccionados",
      cancel: "Cancelar",
      clear_array_input: "Vaciar la lista",
      clear_input_value: "Borrar valor",
      clone: "Duplicar",
      confirm: "Confirmar",
      create: "Crear",
      create_item: "Crear %{item}",
      delete: "Eliminar",
      edit: "Editar",
      export: "Exportar",
      list: "Lista",
      refresh: "Actualizar",
      remove_filter: "Quitar este filtro",
      remove_all_filters: "Quitar todos los filtros",
      remove: "Quitar",
      reset: "Restablecer",
      save: "Guardar",
      search: "Buscar",
      search_columns: "Buscar columnas",
      select_all: "Seleccionar todo",
      select_all_button: "Seleccionar todo",
      select_row: "Seleccionar esta fila",
      show: "Ver",
      sort: "Ordenar",
      undo: "Deshacer",
      unselect: "Quitar selección",
      expand: "Expandir",
      close: "Cerrar",
      open_menu: "Abrir menú",
      close_menu: "Cerrar menú",
      update: "Actualizar",
      move_up: "Subir",
      move_down: "Bajar",
      open: "Abrir",
      toggle_theme: "Cambiar a modo claro/oscuro",
      select_columns: "Columnas",
      update_application: "Recargar la aplicación",
    },
    boolean: {
      true: "Sí",
      false: "No",
      null: " ",
    },
    page: {
      create: "Crear %{name}",
      dashboard: "Inicio",
      edit: "%{name} %{recordRepresentation}",
      error: "Algo salió mal",
      list: "%{name}",
      loading: "Cargando",
      not_found: "No encontrado",
      show: "%{name} %{recordRepresentation}",
      empty: "Todavía no hay %{name}.",
      invite: "¿Quieres agregar uno?",
      access_denied: "Acceso denegado",
      authentication_error: "Error al iniciar sesión",
    },
    input: {
      file: {
        upload_several:
          "Arrastra archivos aquí para subirlos, o haz clic para elegir uno.",
        upload_single:
          "Arrastra un archivo aquí para subirlo, o haz clic para elegirlo.",
      },
      image: {
        upload_several:
          "Arrastra imágenes aquí para subirlas, o haz clic para elegir una.",
        upload_single:
          "Arrastra una imagen aquí para subirla, o haz clic para elegirla.",
      },
      references: {
        all_missing: "No se encontraron los datos relacionados.",
        many_missing:
          "Al menos uno de los elementos relacionados ya no está disponible.",
        single_missing: "El elemento relacionado ya no está disponible.",
      },
      password: {
        toggle_visible: "Ocultar contraseña",
        toggle_hidden: "Mostrar contraseña",
      },
    },
    message: {
      about: "Acerca de",
      access_denied: "No tienes permiso para ver esta página",
      are_you_sure: "¿Estás seguro?",
      authentication_error:
        "No pudimos validar tus datos de acceso. Inténtalo de nuevo.",
      auth_error: "Hubo un error al validar tu sesión.",
      bulk_delete_content:
        "¿Seguro que quieres eliminar este %{name}? |||| ¿Seguro que quieres eliminar estos %{smart_count} elementos?",
      bulk_delete_title:
        "Eliminar %{name} |||| Eliminar %{smart_count} %{name}",
      bulk_update_content:
        "¿Seguro que quieres actualizar %{name} %{recordRepresentation}? |||| ¿Seguro que quieres actualizar estos %{smart_count} elementos?",
      bulk_update_title:
        "Actualizar %{name} %{recordRepresentation} |||| Actualizar %{smart_count} %{name}",
      clear_array_input: "¿Seguro que quieres vaciar toda la lista?",
      delete_content: "¿Seguro que quieres eliminar este %{name}?",
      delete_title: "Eliminar %{name} %{recordRepresentation}",
      details: "Detalles",
      error: "Ocurrió un error y no pudimos completar tu solicitud.",
      invalid_form: "El formulario tiene errores. Revísalo, por favor.",
      loading: "Espera un momento",
      no: "No",
      not_found: "La dirección no existe o el enlace está roto.",
      select_all_limit_reached:
        "Hay demasiados elementos para seleccionarlos todos. Solo se seleccionaron los primeros %{max}.",
      unsaved_changes:
        "Tienes cambios sin guardar. ¿Seguro que quieres descartarlos?",
      yes: "Sí",
      placeholder_data_warning:
        "Problema de conexión: no se pudieron actualizar los datos.",
    },
    navigation: {
      clear_filters: "Limpiar filtros",
      no_filtered_results: "No hay %{name} con los filtros actuales.",
      no_results: "No hay resultados",
      no_more_results:
        "La página %{page} no existe. Prueba con la página anterior.",
      page_out_of_boundaries: "La página %{page} no existe",
      page_out_from_end: "Ya estás en la última página",
      page_out_from_begin: "Ya estás en la primera página",
      page_range_info: "%{offsetBegin}-%{offsetEnd} de %{total}",
      partial_page_range_info:
        "%{offsetBegin}-%{offsetEnd} de más de %{offsetEnd}",
      current_page: "Página %{page}",
      page: "Ir a la página %{page}",
      first: "Ir a la primera página",
      last: "Ir a la última página",
      next: "Ir a la página siguiente",
      previous: "Ir a la página anterior",
      page_rows_per_page: "Filas por página:",
      skip_nav: "Saltar al contenido",
    },
    sort: {
      sort_by: "Ordenar por %{field_lower_first} %{order}",
      ASC: "ascendente",
      DESC: "descendente",
    },
    auth: {
      auth_check_error: "Inicia sesión para continuar",
      user_menu: "Perfil",
      username: "Usuario",
      password: "Contraseña",
      email: "Correo",
      sign_in: "Iniciar sesión",
      sign_in_error: "No pudimos iniciar tu sesión. Inténtalo de nuevo.",
      logout: "Cerrar sesión",
    },
    notification: {
      updated: "Elemento actualizado |||| %{smart_count} elementos actualizados",
      created: "Elemento creado",
      deleted: "Elemento eliminado |||| %{smart_count} elementos eliminados",
      bad_item: "Elemento incorrecto",
      item_doesnt_exist: "El elemento no existe",
      http_error: "Error de comunicación con el servidor",
      data_provider_error:
        "Error al obtener los datos. Revisa la consola para más detalles.",
      i18n_error: "No se pudieron cargar las traducciones de este idioma",
      canceled: "Acción cancelada",
      logged_out: "Tu sesión terminó. Vuelve a iniciar sesión.",
      not_authorized: "No tienes permiso para ver esto.",
      application_update_available: "Hay una nueva versión disponible.",
      offline: "Sin conexión. No se pudieron cargar los datos.",
    },
    validation: {
      required: "Obligatorio",
      minLength: "Debe tener al menos %{min} caracteres",
      maxLength: "Debe tener %{max} caracteres o menos",
      minValue: "Debe ser al menos %{min}",
      maxValue: "Debe ser %{max} o menos",
      number: "Debe ser un número",
      email: "Debe ser un correo válido",
      oneOf: "Debe ser uno de: %{options}",
      regex: "Debe tener un formato específico (regexp): %{pattern}",
      unique: "Ya existe, debe ser único",
    },
    saved_queries: {
      label: "Búsquedas guardadas",
      query_name: "Nombre de la búsqueda",
      new_label: "Guardar búsqueda actual...",
      new_dialog_title: "Guardar búsqueda actual como",
      remove_label: "Eliminar búsqueda guardada",
      remove_label_with_name: 'Eliminar búsqueda "%{name}"',
      remove_dialog_title: "¿Eliminar búsqueda guardada?",
      remove_message:
        "¿Seguro que quieres quitar este elemento de tus búsquedas guardadas?",
      help: "Filtra la lista y guarda esta búsqueda para después",
    },
    guesser: {
      empty: {
        title: "No hay datos para mostrar",
        message: "Revisa el proveedor de datos",
      },
    },
    configurable: {
      customize: "Personalizar",
      configureMode: "Configurar esta página",
      inspector: {
        title: "Inspector",
        content: "Pasa el mouse sobre la interfaz para configurar sus elementos",
        reset: "Restablecer ajustes",
        hideAll: "Ocultar todo",
        showAll: "Mostrar todo",
      },
      Datagrid: {
        title: "Tabla",
        unlabeled: "Columna sin nombre #%{column}",
      },
      SimpleForm: {
        title: "Formulario",
        unlabeled: "Campo sin nombre #%{input}",
      },
      SimpleList: {
        title: "Lista",
        primaryText: "Texto principal",
        secondaryText: "Texto secundario",
        tertiaryText: "Texto terciario",
      },
    },
  },
};
