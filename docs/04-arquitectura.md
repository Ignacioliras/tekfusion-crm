# 04 · Arquitectura

## Vista general

```
Correo (informacion@ / Wix / Chatonbo) ──► Gmail marketing ──IMAP──► n8n (flujo 01)
                                                                        │ IA clasifica
                                                                        ▼
Cliente por WhatsApp ──► Evolution API ──webhook──► Edge Function ──► Supabase (Postgres)
                                                       (receptor)        ▲      │ realtime
                                                                         │      ▼
                                      n8n (flujos 02–09) ◄──────────────┘   CRM web (React)
                                        │  seguimientos, alertas,            crm.tekfusion.cl
                                        │  reportes, archivado
                                        ├──SMTP VíaRed──► Cliente (correo, a nombre del ejecutivo)
                                        ├──Evolution────► Cliente (WhatsApp, firmado)
                                        └──Evolution────► Ejecutivo (avisos a su celular)
```

## Principios

1. **Supabase es la fuente de verdad.** Todo lo que se ve en el CRM está en Postgres. n8n y Evolution no guardan estado de negocio.
2. **Ruta crítica sin n8n.** La recepción de mensajes de WhatsApp va Evolution → Edge Function → Postgres. El CRM los muestra por Realtime. Si n8n se cae, el chat sigue.
3. **n8n solo automatiza.** Lee de Postgres, decide, envía (correo/WhatsApp), escribe el resultado en Postgres. Cada flujo es idempotente: se puede reejecutar sin duplicar envíos (usa columnas `enviado_en`, `intentos`, `job_id`).
4. **Idempotencia en la recepción.** `mensajes.wa_message_id` UNIQUE. El webhook responde 200 siempre que la fila exista, aunque sea repetida.
5. **Reconciliación.** Un flujo horario compara los últimos mensajes guardados por Evolution (su propia base) con `mensajes` y rescata los que falten.
6. **Separación de ambientes.** Proyectos de Supabase e instancias de Evolution distintos para staging y producción. Mismo repo, distintas variables.
7. **Secretos fuera del código.** `.env` local, Secrets de Supabase para Edge Functions, variables de entorno en Docker Compose y en Cloudflare Pages.

## Componentes

### Frontend (CRM web)
- Base: **Atomic CRM** (marmelab, MIT) clonado. Se rediseña la interfaz con la identidad de TekFusion y se reemplazan/añaden módulos: pipeline con los estados propios, ficha con línea de tiempo, bandeja de WhatsApp, cotizaciones, seguimientos, alertas, dashboard, configuración, créditos.
- React 18 + TypeScript + Vite + Tailwind + shadcn/ui; estado del servidor con TanStack Query; cliente Supabase JS (auth, consultas, realtime, storage).
- Desktop-first (≥ 1280 px óptimo); usable en 1024 px; en pantalla chica solo lectura básica.
- Hosting: Cloudflare Pages (gratis, uso comercial permitido). Dominio `crm.tekfusion.cl` (CNAME).

### Supabase (Pro)
- Postgres con RLS por rol (ver `05-modelo-datos.md` y `08-seguridad-roles.md`).
- Auth: email + contraseña; roles en tabla `perfiles` (no en metadata editable por el usuario).
- Storage: bucket privado `cotizaciones` (PDF) y `adjuntos-whatsapp` (imágenes, audios, documentos). URLs firmadas de corta duración.
- Realtime: canal por conversación y por bandeja (tabla `mensajes`, `leads`, `alertas`).
- Edge Functions:
  - `whatsapp-webhook`: recibe eventos de Evolution, valida `apikey`, normaliza, inserta mensaje, actualiza conversación, crea lead si el número no tiene uno activo, descarga adjuntos a Storage.
  - `whatsapp-send`: envía mensajes desde el CRM (texto, adjunto, cotización) pasando por las reglas anti-bloqueo mínimas (horario no aplica a envíos manuales del ejecutivo).
  - `email-send`: envía correos desde la casilla del ejecutivo (SMTP VíaRed) para acciones manuales desde la ficha.
- Respaldos diarios (incluidos en Pro) + export semanal a Storage.

### Evolution API (VPS, Docker)
- Una instancia por ambiente. Conexión por QR del número corporativo (Baileys). Persistencia en Postgres propio del contenedor (volumen respaldado).
- Webhook configurado hacia `whatsapp-webhook` con eventos: `messages.upsert`, `messages.update` (estados), `connection.update`, `send.message`.
- Fallback documentado: si el número es bloqueado, Evolution puede conectarse a la Cloud API oficial de Meta; el CRM no cambia.

### n8n (VPS, Docker)
- Flujos 01–09 (ver `06-flujos-n8n.md`). Credenciales: Supabase (service role, solo en n8n), SMTP/IMAP por ejecutivo, Gmail IMAP, Evolution API key, Anthropic API key.
- Se exportan al repo en `n8n/flows/`.

### IA
- Claude Haiku (API) para: clasificar línea, extraer datos de contacto y resumir. Salida JSON con esquema fijo; `null` por defecto cuando no hay dato; nunca inventar. Prompt y esquema en `n8n/prompts/clasificar-lead.md`.
- Costo estimado: < US$5/mes a 100 leads.

### Monitoreo
- Uptime Kuma (VPS): checks HTTP a CRM, Supabase, Evolution (`/instance/connectionState`), n8n. Avisos a Libux por Telegram/correo y a gerencia por WhatsApp cuando Evolution se desconecta (flujo 08).

## Infraestructura y cuentas (todas a nombre de TekFusion, administradas por Libux)

| Recurso | Proveedor | Plan | Costo aprox. |
|---|---|---|---|
| Base de datos/auth/storage | Supabase | Pro | US$25/mes |
| VPS 8 GB (Evolution, n8n, Uptime Kuma) | Hostinger | KVM | US$10–15/mes |
| Hosting web | Cloudflare Pages | Free | US$0 |
| IA | Anthropic | API | ~US$2–5/mes |
| Dominio | el de TekFusion | subdominio | US$0 |
| Repositorio | GitHub | privado | US$0 |

## Estructura del repositorio

```
tekfusion-crm/
├── CLAUDE.md
├── README.md
├── .env.example
├── docs/                      # esta documentación
├── src/                       # frontend (base Atomic CRM)
│   ├── features/{leads,pipeline,whatsapp,cotizaciones,seguimientos,alertas,dashboard,admin}
│   ├── components/{ui,common}
│   └── lib/{supabase.ts,estados.ts,formato.ts}
├── supabase/
│   ├── migrations/
│   ├── seed.sql               # datos ficticios para local/staging
│   └── functions/{whatsapp-webhook,whatsapp-send,email-send}
├── n8n/
│   ├── flows/01-ingreso-leads.json … 09-monitoreo.json
│   └── prompts/clasificar-lead.md
├── infra/
│   ├── docker-compose.yml     # evolution, n8n, uptime-kuma
│   └── README.md              # instalación del VPS paso a paso
└── .claude/commands/          # /handoff, /estado
```
