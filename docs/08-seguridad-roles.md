# 08 · Seguridad, roles y datos

Base: documentación oficial de Supabase (checklist de seguridad), RLS por defecto de Atomic CRM (permite ver todo; se reemplaza), prácticas de Evolution API y n8n. Las tareas marcadas **[Fase N]** están en `09-plan-fases.md` con nombre propio: no son "buenas prácticas", son trabajo.

## Autenticación
- Supabase Auth con correo + contraseña. Recuperación por correo. Sin registro público: los usuarios los crea gerencia (o Libux) desde Configuración.
- El rol vive en `perfiles.rol`, escrito solo por gerencia (policy). Nunca en `user_metadata` (editable por el usuario).
- Sesiones: expiración 12 h; cierre de sesión al cambiar contraseña.
- **2FA (TOTP) obligatorio para gerencia**, opcional para ejecutivos. Supabase Auth MFA. **[Fase 2]**
- Contraseña mínima 12 caracteres; activar en Supabase la protección contra contraseñas filtradas (HaveIBeenPwned). **[Fase 2]**
- Baja de un usuario (checklist): desactivar en Auth, cerrar sus sesiones, rotar su clave SMTP/IMAP, reasignar sus leads y conversaciones, anotar en `actividades`. Vive en Configuración → Usuarios → "Dar de baja". **[Fase 3]**

## RLS (políticas por tabla)
Función auxiliar: `fn_rol()` devuelve el rol del `auth.uid()`; `fn_es_gerencia()`.

| Tabla | select | insert | update | delete |
|---|---|---|---|---|
| perfiles | todos ven nombre/rol/firma; datos SMTP solo el propio o gerencia | gerencia | propio (nombre, firma, smtp/imap) o gerencia | nadie (desactivar) |
| leads | gerencia y lector: todos; ejecutivo: `ejecutivo_id = auth.uid()` o `ejecutivo_id is null` (sin asignar, solo lectura) | gerencia, ejecutivo | gerencia; ejecutivo solo los suyos; `ejecutivo_id` solo lo cambia gerencia (o "tomar" un lead sin asignar) | nadie |
| contactos | igual que leads (vía join) | gerencia, ejecutivo | gerencia, ejecutivo de un lead del contacto | nadie (anonimizar = update por gerencia) |
| conversaciones, mensajes | gerencia: todas; ejecutivo: las suyas y sin asignar; lector: ninguna | solo service role (Edge Function / n8n) y `whatsapp-send` | idem | nadie |
| cotizaciones, seguimientos, actividades, correos | según el lead | gerencia, ejecutivo dueño | idem | nadie (cancelar seguimiento = update) |
| alertas | destinatario o gerencia | service role | destinatario (marcar leída) | nadie |
| configuracion, plantillas, motivos_perdida, lineas_negocio, ausencias, respuestas_rapidas | todos leen | gerencia | gerencia | gerencia |
| vista_ranking_ejecutivos | solo gerencia | — | — | — |

- **Reemplazar las policies por defecto de Atomic CRM** (permiten que cualquier usuario autenticado lea todo). Tarea bloqueante de la Fase 2; se verifica con tests de RLS con pgTAP (`supabase test db`) que corren en cada PR.
- La service role key solo existe en n8n y en las Edge Functions; nunca en el frontend.
- Revisar el "Security Advisor" del panel de Supabase antes de cerrar cada fase.

## Contenido que entra desde afuera (la vulnerabilidad más probable en este CRM)
- **Correos y mensajes de WhatsApp son HTML/texto de desconocidos.** Nunca se renderizan crudos. Correos: convertir a texto o sanitizar con DOMPurify (lista blanca: p, br, b, i, a sin javascript:, ul/li). WhatsApp: siempre texto plano. **[Fase 3]**
- **Clasificador (Haiku):** el texto del correo puede intentar manipular al modelo. La salida se valida contra el esquema JSON exacto (zod); cualquier otra cosa → `indeterminada`. El resultado solo clasifica y asigna; nunca ejecuta acciones, envía mensajes ni cambia configuración. **[Fase 5]**
- **Formulario web:** Cloudflare Turnstile (gratis) para que los bots no llenen el CRM. **[Fase 1]**
- **Adjuntos:** tipos permitidos (PDF, JPG, PNG, XLSX, DOCX), tamaño máximo 15 MB, nombre de archivo regenerado (UUID) al guardar en Storage. **[Fase 3]**
- **Edge Functions:** validación de entrada con zod; respuesta 401 sin `apikey`; límite de tamaño del body; rate limit básico por IP (Supabase lo trae en Edge Functions). **[Fase 4]**

## Storage
- Buckets privados. Acceso por URL firmada (60 min) generada tras verificar que el usuario puede ver el lead (policy de Storage basada en `leads`).

## Secretos
- `.env.example` documenta cada variable; `.env` nunca se commitea. Pre-commit con **gitleaks**; en GitHub, *secret scanning* con *push protection* activado.
- Contraseñas SMTP/IMAP de ejecutivos cifradas en Postgres (Vault) y descifradas solo en n8n/Edge Functions.
- **Bóveda** (Bitwarden, organización "TekFusion CRM" compartida con la contraparte): todas las claves de plataforma, `.env` de producción, `N8N_ENCRYPTION_KEY`, `AUTHENTICATION_API_KEY` de Evolution, códigos de recuperación de 2FA. **[Fase 1]**
- Rotación: si una clave se expone, se rota el mismo día y se anota en `10-decisiones.md`.
- Cuenta de Anthropic API con tope de gasto mensual configurado (US$20 basta para 100 leads/mes).

## Cuentas de plataforma
- **2FA en todas:** Supabase, GitHub, Cloudflare, Hostinger, VíaRed, Gmail de marketing, Bitwarden. Códigos de recuperación en la bóveda. **[Fase 1]**
- GitHub: repo privado, rama `main` protegida (PR + CI en verde), Dependabot activado.
- Cloudflare: HTTPS estricto, HSTS; **Cloudflare Access** delante de `staging.crm.tekfusion.cl` (solo correos de Libux y TekFusion). **[Fase 1]**

## Servidor (VPS)
- SSH solo con llave, sin login de root, puerto por defecto, `fail2ban`. Firewall (`ufw`): solo 22, 80 y 443. **[Fase 1]**
- **Ningún contenedor con puertos expuestos públicamente.** Evolution, n8n, Uptime Kuma y las bases de datos solo en la red interna de Docker, detrás de Caddy con HTTPS.
- n8n con su autenticación propia (usuario único de Libux, 2FA). Uptime Kuma con clave. El panel `/manager` de Evolution apagado en producción.
- `unattended-upgrades` activo; imágenes de Docker fijadas a versión (nunca `latest`); actualización de Evolution/n8n una vez al mes, primero en staging.

## Webhooks
- Evolution → Edge Function: header `apikey` secreto (`EVOLUTION_WEBHOOK_SECRET`).
- Postgres → n8n: webhooks de Supabase con token en header; n8n valida.
- n8n → Supabase: service role.

## Correo (dominio tekfusion.cl)
- **SPF, DKIM y DMARC** verificados (mxtoolbox) antes de que salga el primer seguimiento automático. Sin esto los envíos caen en spam y cualquiera puede suplantar a TekFusion. Se pide a VíaRed en el kickoff (`11-pendientes-kickoff.md`). **[Fase 1, pedir; Fase 7, verificar]**
- Límite de envíos por hora del plan VíaRed respetado por el motor de seguimientos.

## Datos de clientes
- Datos reales solo en producción. Staging y local usan `seed.sql`.
- Nada de datos de TekFusion en Notion de Libux, bots, ni chats de IA. Para pedir ayuda sobre un caso, anonimizar.
- Exportaciones (CSV) solo para gerencia; quedan en `actividades` de sistema con autor.
- **Ley 21.719 (protección de datos personales, vigente diciembre 2026):** aviso de privacidad en el formulario web; función "Anonimizar contacto" (gerencia) que reemplaza nombre, correo y teléfono por valores anónimos y borra adjuntos, conservando las métricas (RF-17). Retención: leads perdidos/archivados se anonimizan a los 24 meses (configurable). **[Fase 3]**
- Al término del servicio: exportación completa a TekFusion y borrado de copias en Libux.

## Respaldos y recuperación
| Qué | Cómo | Frecuencia | Dónde queda | Retención |
|---|---|---|---|---|
| Base de datos Supabase prod | respaldo automático del plan Pro | diario | Supabase | 7 días |
| Base de datos Supabase prod | `pg_dump` desde n8n (flujo 12) | semanal | **Cloudflare R2** (bucket `tekfusion-backups`, cuenta de TekFusion) | 90 días |
| Storage (cotizaciones, adjuntos) | `rclone` desde el VPS | semanal | R2 | 90 días |
| VPS: base de n8n, volumen de Evolution (sesión Baileys), config de Caddy y Uptime Kuma | `rsync`/`rclone` | diario | R2 | 30 días |
| VPS completo | snapshot de Hostinger | semanal | Hostinger | 4 |
| `N8N_ENCRYPTION_KEY`, `.env` prod, claves | bóveda Bitwarden | al cambiar | Bitwarden | — |

- **Regla:** ninguna copia queda solo en el mismo proveedor que el original. Supabase → R2; VPS → R2.
- **Sin `N8N_ENCRYPTION_KEY` el respaldo de n8n no sirve** (las credenciales quedan ilegibles). Está en la bóveda, no solo en el servidor.
- **Prueba de restauración con reloj en staging** (base + Storage + n8n + Evolution): se anota cuánto demoró y qué faltó. **[Fase 5]** Se repite cada 6 meses dentro del plan de mantención.
- Objetivo: volver a operar en menos de 4 horas con pérdida máxima de 24 h de datos (de 1 semana para Storage).

## Monitoreo y registro
- Uptime Kuma: CRM, Supabase, Evolution, n8n, y el estado de conexión del número. **Avisos a WhatsApp/Telegram de Libux**, no solo al panel. **[Fase 1]**
- **Sentry (plan gratis)** en el frontend y en las Edge Functions para errores reales de los usuarios. **[Fase 3]**
- `actividades` registra quién hizo qué en cada lead. Logs de Auth de Supabase (inicios de sesión) y de Edge Functions y n8n con retención de 30 días.
- Dependabot + `npm audit --audit-level=high` en CI.

## Plan de incidente (una página, `docs/incidente.md` en Fase 7)
1. **Clave expuesta:** rotar en el origen → actualizar bóveda → actualizar `.env`/secrets → redeploy → anotar en `10-decisiones.md`. Quién: Libux. Plazo: mismo día.
2. **WhatsApp usado de forma extraña o número bloqueado:** apagar la instancia de Evolution (`docker compose stop evolution`), avisar a gerencia, revisar `mensajes` de las últimas 24 h. Quién decide apagar: Ignacio o la contraparte de TekFusion.
3. **Base de datos dañada o borrado masivo:** restaurar desde R2 a staging, verificar, luego a prod. Avisar a TekFusion antes de restaurar.
4. **Acceso no autorizado:** cerrar todas las sesiones (Supabase), rotar claves, revisar logs de Auth, avisar a TekFusion por escrito el mismo día (la ley 21.719 exige notificar brechas).
5. Siempre: registro del incidente (qué, cuándo, qué se hizo) en `docs/incidentes/AAAA-MM-DD.md`.
