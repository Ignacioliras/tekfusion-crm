import type { TranslationMessages } from "ra-core";
import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Spanish (Chile) translation of Atomic's own keys (englishCrmMessages.ts).
// Typed against the English catalog, so a misspelled key fails typecheck;
// missing keys fall back to English.
export const spanishCrmMessages: PartialCrmMessages = {
  crm: {
    language: "Idioma",
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
