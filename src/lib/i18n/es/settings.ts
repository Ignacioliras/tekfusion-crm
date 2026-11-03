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
        name: "Nombre",
        role: "Rol",
        business_lines: "Línea a cargo",
        substitute: "Suplente",
        no_substitute: "Sin suplente",
        absences: "Ausencias",
        starts_on: "Desde",
        ends_on: "Hasta",
        absence_reason: "Motivo",
      },
      roles: {
        manager: "Gerencia",
        executive: "Ejecutivo",
        reader: "Lector",
      },
      sections: {
        assignment: "Líneas de negocio y ausencias",
      },
      helpers: {
        business_lines: "Los leads de estas líneas se asignan a este usuario.",
        substitute:
          "Recibe los leads nuevos mientras este usuario está ausente. Vale para todas sus líneas.",
      },
      offboard: {
        button: "Dar de baja",
        title: "¿Dar de baja a %{name}?",
        content:
          "Se desactiva su acceso y se cierran sus sesiones; sus leads abiertos y sus líneas pasan a su suplente, o quedan sin asignar. La cuenta se puede reactivar después.",
        success: "Usuario dado de baja",
        error: "No se pudo dar de baja al usuario. Inténtalo de nuevo.",
      },
      validation: {
        self_substitute: "Un usuario no puede ser su propio suplente",
        absence_range: "La fecha de término debe ser igual o posterior a la de inicio",
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
    mfa: {
      title: "Verificación en dos pasos",
      enabled: "Activada",
      disabled: "No activada",
      required_hint: "Obligatoria para gerencia.",
      enable: "Activar",
      disable: "Desactivar",
      enroll_title: "Activa la verificación en dos pasos",
      enroll_intro: "Escanea el código con Google Authenticator, Microsoft Authenticator o 1Password y escribe el código de 6 dígitos que muestra.",
      secret: "Si no puedes escanear, ingresa esta clave a mano:",
      code: "Código de 6 dígitos",
      confirm: "Confirmar",
      verify_title: "Verificación en dos pasos",
      verify_intro: "Escribe el código de tu aplicación de autenticación.",
      verify: "Entrar",
      invalid_code: "Código incorrecto. Inténtalo de nuevo.",
      enrolled: "Verificación en dos pasos activada",
      unenrolled: "Verificación en dos pasos desactivada",
      enroll_error: "No se pudo activar la verificación en dos pasos. Inténtalo de nuevo.",
      qr_alt: "Código QR",
      logout: "Cerrar sesión",
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
