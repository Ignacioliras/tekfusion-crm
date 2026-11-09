import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Shared texts, layout and Credits page.
export const commonMessages: PartialCrmMessages = {
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
    header: {
      import_data: "Importar desde JSON",
    },
    theme: {
      dark: "Oscuro",
      label: "Tema",
      light: "Claro",
      system: "Sistema",
    },
    navigation: {
      label: "Navegación del CRM",
      pipeline: "Pipeline",
      dashboard: "Dashboard",
      whatsapp: "WhatsApp",
    },
    a11y: {
      pagination: "paginación",
      more_pages: "Más páginas",
      breadcrumb: "ruta de navegación",
      more: "Más",
      toggle_sidebar: "Mostrar u ocultar la barra lateral",
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
    image_editor: {
      change: "Cambiar",
      drop_hint: "Arrastra un archivo para subirlo, o haz clic para elegirlo.",
      editable_content: "Contenido editable",
      title: "Subir y recortar imagen",
      update_image: "Actualizar imagen",
    },
    validation: {
      invalid_url: "Debe ser una URL válida",
      invalid_linkedin_url: "La URL debe ser de linkedin.com",
    },
  },
};
