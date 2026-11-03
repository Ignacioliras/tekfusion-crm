import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";

// Login, sign-up and password screens (Atomic's own keys).
export const authMessages: PartialCrmMessages = {
  crm: {
    action: {
      reset_password: "Restablecer contraseña",
    },
    auth: {
      first_name: "Nombre",
      last_name: "Apellido",
      confirm_password: "Confirmar contraseña",
      confirmation_required:
        "Sigue el enlace que te enviamos por correo para confirmar tu cuenta.",
      recovery_email_sent:
        "Si estás registrado, pronto recibirás un correo para recuperar tu contraseña.",
      sign_in_failed: "No se pudo iniciar sesión.",
      sign_in_google_workspace: "Entrar con Google Workspace",
      signup: {
        create_account: "Crear cuenta",
        create_first_user:
          "Crea la primera cuenta de usuario para terminar la configuración.",
        creating: "Creando...",
        initial_user_created: "Usuario inicial creado",
      },
      welcome_title: "Bienvenido a CRM TekFusion",
    },
  },
};

// ra-supabase auth screens (keys from ra-supabase-language-english).
export const raSupabaseMessages = {
  "ra-supabase": {
    auth: {
      email: "Correo",
      confirm_password: "Confirmar contraseña",
      sign_in_with: "Entrar con %{provider}",
      forgot_password: "¿Olvidaste tu contraseña?",
      reset_password: "Restablecer contraseña",
      password_reset: "Revisa tu correo: te enviamos un enlace para restablecer tu contraseña.",
      missing_tokens: "Faltan los tokens de acceso y de renovación",
      back_to_login: "Volver al inicio de sesión",
    },
    reset_password: {
      forgot_password: "¿Olvidaste tu contraseña?",
      forgot_password_details: "Ingresa tu correo para recibir las instrucciones.",
    },
    set_password: {
      new_password: "Elige tu contraseña",
    },
    validation: {
      password_mismatch: "Las contraseñas no coinciden",
    },
  },
};
