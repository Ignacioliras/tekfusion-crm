import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Settings, users (sales, called "ejecutivos") and profile.
export const settingsMessages: PartialCrmMessages = {
  resources: {
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
  },
  crm: {
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
  },
};
