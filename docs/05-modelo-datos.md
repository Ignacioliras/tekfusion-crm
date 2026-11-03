# 05 · Modelo de datos (Supabase / Postgres)

> **Leer primero (actualizado 2026-11-03, al fusionar con Atomic CRM).** Este documento se escribió con nombres en español antes de ver el código de Atomic. **Lo que vale es el contenido (campos, reglas, restricciones); los nombres se implementan en inglés y reutilizando las tablas de Atomic.** El esquema se escribe en `supabase/schemas/10_tekfusion_*.sql` (declarativo) y la migración se genera con `npx supabase db diff`.
>
> | Aquí (español) | Implementación | Nota |
> |---|---|---|
> | `perfiles` | `sales` (Atomic) + `role`, `whatsapp_phone`, `signature` (hecho, Fase 2). `activo` = `disabled`; el suplente vive en `business_lines`; SMTP/IMAP irán en `sales_mail_accounts` (Fase 5, Vault) | `sales` ya está ligada a `auth.users` por triggers; Atomic desactiva, no borra |
> | `contactos` | `contacts` + `companies` (Atomic) | Atomic separa empresa y persona; mantenerlo |
> | `leads` | `deals` (Atomic) + `business_line`, `ai_confidence`, `origin_channel`, `raw_source`, `first_response_at`, `last_activity_at`, `lost_reason_id`, `won_amount`, `previous_deal_id`, `followups_enabled` (hecho, Fase 2); `archived_at` ya existía | etapa = `deals.stage` con `check` (`estados.ts` es la única fuente) |
> | `actividades` | `deal_notes` / `contact_notes` + vista de actividad de Atomic (`activity_log`) + tabla `deal_events` para eventos de sistema | reutilizar la vista existente |
> | `lineas_negocio` | `business_lines` | |
> | `ausencias` | `sales_absences` | |
> | `actividades` (eventos de sistema) | `audit_log` (hecho, Fase 2): `actor_sales_id`, `action`, `target_sales_id`, `deal_id`, `details`; lee gerencia, escribe solo el sistema. Reemplaza al `deal_events` planeado | las filas con `deal_id` alimentan la línea de tiempo del lead: `deal.stage_changed` y `deal.reassigned` los escribe el trigger `log_deal_changes` (Fase 3) y quien ve el lead lee sus filas |
> | adjuntos (Storage) | bucket `attachments` **privado** (Fase 2): archivos bajo `deals/<id>/`, `contacts/<id>/`, `companies/`, `sales/`, `config/`; lectura por URL firmada de 60 min y policy `can_read_attachment` / `can_write_attachment` | la base guarda la URL pública como referencia estable; el data provider la firma al leer |
> | `cotizaciones` | `quotes` (hecho, Fase 3): `deal_id`, `version`, `amount`, `pdf_path`, `is_current`, `sent_at`, `sent_channels`, `delivery_status`, `sales_id` (autor) | PDF en el bucket privado `quotes`, `deals/<id>/<uuid>.pdf`, solo PDF, 15 MB |
> | `seguimientos` | `followups` (hecho, Fase 3) | cancelar = update; `job_id` único |
> | `conversaciones` / `mensajes` | `wa_conversations` / `wa_messages` | `wa_message_id` UNIQUE |
> | `correos` | `emails` | |
> | cola de envío | `send_queue` (hecho, Fase 3): una fila por canal de cada cotización enviada (`deal_id`, `quote_id`, `channel`, `status`, `sales_id`, `sent_at`, `attempts`, `error`); la escribe solo `send_quote()` y la consume n8n (Fase 5) | `unique (quote_id, channel)`; nadie la borra |
| `alertas` | `alerts` (hecho, Fase 3): `recipient_sales_id` = destinatario | el usuario solo escribe `read_at` |
> | `plantillas`, `respuestas_rapidas`, `motivos_perdida` | `templates`, `quick_replies` (hechas, Fase 3), `lost_reasons` | Atomic tuvo `deals.lost_reason` y lo eliminó (migración 2026-09-28): usar tabla propia |
> | `configuracion` | `configuration` (Atomic) | ya existe; extender sus claves |
> | `estado_whatsapp`, `importaciones` | `wa_instance_status`, `imports` (nuevas) | Atomic ya trae importador CSV de contactos en el frontend (`contacts/`): extenderlo para deals |
> | enum `rol_usuario` | `user_role` (`manager`,`executive`,`reader`) | etiquetas en español en la interfaz |
>
> **Implementado el 2026-11-03** (`docs/fase-2-propuesta.md` aprobada; decisiones en `10-decisiones.md`): `supabase/schemas/10_tekfusion_tables.sql` (tipos `user_role`, `business_line`, `origin_channel`; tablas `business_lines`, `lost_reasons`, `sales_absences`; columnas en `sales`, `deals`, `contacts`), `11_tekfusion_policies.sql` (RLS, `take_deal`, triggers de guarda) y `12_tekfusion_grants.sql`. Ids `bigint` (no `uuid`) y valores de enum en español. Las tablas de las Fases 3–5 (`quotes`, `followups`, `wa_*`, `emails`, `alerts`, `templates`, …) se crean en su fase, con RLS y tests desde el primer día.

Convenciones: `snake_case`, `id uuid default gen_random_uuid()`, `creado_en timestamptz default now()`, `actualizado_en` con trigger. Montos en CLP como `integer`. Teléfonos en E.164 (`+569XXXXXXXX`). Todas las tablas con RLS activa (ver `08-seguridad-roles.md`).

## Enums

```sql
create type rol_usuario as enum ('gerencia','ejecutivo','lector');
create type linea_negocio as enum ('valvulas','tuberias','geoceldas','indeterminada');
create type lead_estado as enum ('nuevo','contactado','cotizado','ganado','perdido','archivado');
create type canal_origen as enum ('correo','formulario','bot','whatsapp','manual','migracion');
create type canal_envio as enum ('correo','whatsapp');
create type seguimiento_modo as enum ('automatico','recordatorio');
create type seguimiento_estado as enum ('pendiente','enviado','vencido','cancelado');
create type mensaje_direccion as enum ('entrante','saliente');
create type mensaje_estado as enum ('pendiente','enviado','entregado','leido','fallido');
create type mensaje_tipo as enum ('texto','imagen','documento','audio','video','otro');
create type actividad_tipo as enum ('nota','cambio_estado','reasignacion','correo_entrante','correo_saliente','whatsapp','seguimiento','cotizacion','sistema');
create type alerta_tipo as enum ('sin_contacto_24h','sin_contacto_48h','seguimiento_vencido','cliente_respondio','whatsapp_desconectado','por_archivar','sin_asignar');
```

## Tablas

### `perfiles` (1:1 con `auth.users`)
| columna | tipo | nota |
|---|---|---|
| id | uuid PK = auth.users.id | |
| nombre | text | |
| correo | text UNIQUE | |
| rol | rol_usuario | |
| telefono_whatsapp | text | para avisos al ejecutivo |
| firma | text | "— Camila, TekFusion" |
| smtp_host, smtp_port, smtp_user, smtp_pass_enc | text | solo ejecutivo; `smtp_pass_enc` cifrado con `pgsodium`/Vault |
| imap_host, imap_port, imap_user, imap_pass_enc | text | idem |
| activo | boolean | |

### `lineas_negocio`
| columna | tipo |
|---|---|
| id | uuid PK |
| codigo | linea_negocio UNIQUE |
| nombre | text |
| ejecutivo_id | uuid FK perfiles |
| suplente_id | uuid FK perfiles |
| palabras_clave | text[] |

### `ausencias`
| columna | tipo |
|---|---|
| id | uuid PK |
| ejecutivo_id | uuid FK perfiles |
| desde, hasta | date |
| motivo | text |

### `contactos` (empresa + persona; un contacto puede tener varios leads en el tiempo)
| columna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| empresa | text | |
| nombre | text | |
| correo | citext | índice |
| telefono | text | E.164, índice |
| rut | text | opcional |
| no_contactar | boolean default false | |

### `leads`
| columna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| contacto_id | uuid FK contactos | |
| linea | linea_negocio | |
| linea_confianza | numeric(3,2) | de la IA |
| ejecutivo_id | uuid FK perfiles NULL | NULL = sin asignar |
| estado | lead_estado default 'nuevo' | |
| canal_origen | canal_origen | |
| necesidad | text | resumen de la IA / texto del cliente |
| fuente_cruda | jsonb | correo original, payload del form, primer mensaje |
| lead_anterior_id | uuid FK leads NULL | cliente recurrente |
| motivo_perdida_id | uuid FK motivos_perdida NULL | |
| monto_final | integer NULL | al ganar |
| primer_contacto_en | timestamptz NULL | se setea con la primera acción saliente |
| ultima_actividad_en | timestamptz | trigger |
| seguimiento_activo | boolean default true | |
| creado_en, actualizado_en | timestamptz | |

Índices: `(ejecutivo_id, estado)`, `(estado, creado_en)`, `(contacto_id)`.

### `cotizaciones`
| columna | tipo |
|---|---|
| id | uuid PK |
| lead_id | uuid FK leads |
| version | int |
| monto | integer |
| pdf_path | text (Storage) |
| enviada_en | timestamptz NULL |
| canales | canal_envio[] |
| vigente | boolean |
| creada_por | uuid FK perfiles |

### `seguimientos`
| columna | tipo |
|---|---|
| id | uuid PK |
| lead_id | uuid FK leads |
| paso | int (1,2,3…) |
| programado_para | timestamptz |
| canal | canal_envio[] |
| modo | seguimiento_modo |
| plantilla_id | uuid FK plantillas NULL |
| estado | seguimiento_estado default 'pendiente' |
| enviado_en | timestamptz NULL |
| job_id | text NULL (idempotencia n8n) |
| intentos | int default 0 |
| motivo_cancelacion | text NULL |

### `conversaciones` (una por número de WhatsApp)
| columna | tipo |
|---|---|
| id | uuid PK |
| telefono | text UNIQUE |
| contacto_id | uuid FK contactos NULL |
| lead_activo_id | uuid FK leads NULL |
| ejecutivo_id | uuid FK perfiles NULL |
| ultimo_mensaje_en | timestamptz |
| no_leidos | int default 0 |
| archivada | boolean default false |

### `mensajes`
| columna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| conversacion_id | uuid FK conversaciones | |
| lead_id | uuid FK leads NULL | |
| wa_message_id | text UNIQUE | idempotencia |
| direccion | mensaje_direccion | |
| tipo | mensaje_tipo | |
| texto | text | |
| adjunto_path | text NULL | Storage |
| estado | mensaje_estado | |
| from_me_telefono | boolean default false | escrito desde el teléfono físico |
| autor_id | uuid FK perfiles NULL | quien lo envió desde el CRM |
| origen | text | 'crm' / 'seguimiento' / 'telefono' |
| payload | jsonb | evento crudo de Evolution |
| enviado_en | timestamptz | timestamp de WhatsApp |

### `correos`
| columna | tipo |
|---|---|
| id | uuid PK |
| lead_id | uuid FK leads |
| direccion | mensaje_direccion |
| message_id | text UNIQUE (header Message-ID) |
| in_reply_to | text NULL |
| de, para | text |
| asunto | text |
| cuerpo_texto | text |
| cuenta_perfil_id | uuid FK perfiles NULL (casilla usada) |
| enviado_en | timestamptz |

### `actividades` (línea de tiempo)
| columna | tipo |
|---|---|
| id | uuid PK |
| lead_id | uuid FK leads |
| tipo | actividad_tipo |
| descripcion | text |
| datos | jsonb |
| autor_id | uuid FK perfiles NULL (NULL = sistema) |
| creado_en | timestamptz |

### `alertas`
| columna | tipo |
|---|---|
| id | uuid PK |
| tipo | alerta_tipo |
| lead_id | uuid FK leads NULL |
| destinatario_id | uuid FK perfiles |
| mensaje | text |
| leida_en | timestamptz NULL |
| enviada_whatsapp_en | timestamptz NULL |
| creado_en | timestamptz |

Índice UNIQUE parcial para no repetir la misma alerta abierta: `(tipo, lead_id, destinatario_id) where leida_en is null`.

### `plantillas`
| columna | tipo |
|---|---|
| id | uuid PK |
| nombre | text |
| canal | canal_envio |
| asunto | text NULL (correo) |
| cuerpo | text (variables `{{nombre}}`, `{{empresa}}`, `{{producto}}`, `{{ejecutivo}}`) |
| activa | boolean |

### `respuestas_rapidas` — `id, titulo, texto, activa`
### `motivos_perdida` — `id, nombre, activo, orden`
### `configuracion` (clave-valor) — `clave text PK, valor jsonb`
Claves iniciales: `cadencia_dias` `[2,5,10]`, `horario_habil` `{dias:[1..5], desde:"09:00", hasta:"18:00"}`, `tope_envios_dia` `40`, `separacion_envios_seg` `[45,90]`, `correo_facturacion`, `reporte_semanal` `{dia:"lunes", hora:"08:30", destinatarios:[…]}`, `dias_archivado` `14`, `horas_primer_contacto` `24`.

### `estado_whatsapp` — `id, instancia, conectado boolean, ultimo_evento jsonb, actualizado_en`
### `importaciones` — `id, archivo, filas, creadas, duplicadas, errores jsonb, creado_por, creado_en`

## Vistas y funciones

- `vista_dashboard_mensual` → `public.dashboard_monthly` (hecha, Fase 6; `supabase/schemas/13_tekfusion_dashboard.sql`, `security_invoker`: cada usuario agrega solo los leads que su RLS le deja ver). Una fila por (`month`, `business_line`, `origin_channel`) sobre `deals`, sin excluir nada (los archivados cuentan como archivados). Métricas:
  - `month`: primer día del mes de `created_at` en `America/Santiago`.
  - `leads`: cantidad de leads.
  - `contacted`: etapa distinta de `nuevo` o `first_response_at` no nulo.
  - `quoted`: etapa `cotizado` o con al menos una cotización (un lead cerrado cuenta como cotizado solo si tiene cotización).
  - `won` / `lost` / `archived`: etapa `ganado` / `perdido` / `archivado`.
  - `responded`: con `first_response_at`.
  - `first_response_within_24h`: con `first_response_at - created_at` ≤ 24 h.
  - `avg_first_response_hours`: promedio de `first_response_at - created_at` en horas, 2 decimales; los leads sin respuesta quedan fuera (nulo si ninguno respondió).
  - `quoted_amount`: suma del monto de la cotización vigente (`quotes.is_current`) de cada lead, CLP.
  - `won_amount`: suma de `deals.won_amount`, CLP.
  - Solo lectura para `authenticated` y `service_role`; `anon` sin acceso. Test: `supabase/tests/25_dashboard_monthly.test.sql`. Materializar si hace falta.
- `vista_ranking_ejecutivos` → `public.sales_ranking` (hecha, Fase 6; `supabase/schemas/13_tekfusion_dashboard.sql`, `security_invoker`). Solo gerencia: la vista filtra con `public.is_manager()`, así ejecutivos y lectores reciben cero filas aunque su RLS les deje ver `deals`. Una fila por (`month`, `sales_id`) sobre los leads con dueño (`sales_id` no nulo). Columnas:
  - `month`: primer día del mes de `created_at` en `America/Santiago`.
  - `sales_id`: el ejecutivo dueño del lead.
  - `leads`: cantidad de leads.
  - `leads_attended`: con `first_response_at`.
  - `avg_first_response_hours`: promedio de `first_response_at - created_at` en horas, 2 decimales (nulo si ninguno atendido).
  - `quotes_sent`: cotizaciones de esos leads que se enviaron (`sent_channels` no vacío o con fila en `send_queue`).
  - `won` / `lost`: etapa `ganado` / `perdido`.
  - `won_amount`: suma de `deals.won_amount`, CLP.
  - Solo lectura para `authenticated` y `service_role`; `anon` sin acceso. Test: `supabase/tests/26_sales_ranking.test.sql`.
- `fn_asignar_lead(lead_id)`: aplica reglas de asignación (línea → ejecutivo → ausencia → suplente).
- `fn_programar_seguimientos(lead_id)`: crea los pasos según `configuracion.cadencia_dias` y la cotización vigente.
- `fn_cancelar_seguimientos(lead_id, motivo)`.
- Trigger `tg_lead_contactado`: al insertar una actividad saliente en un lead `nuevo`, pasa a `contactado` y setea `primer_contacto_en`.
- Trigger `tg_mensaje_entrante`: al insertar un mensaje entrante asociado a un lead, llama `fn_cancelar_seguimientos` y crea alerta `cliente_respondio`.

## Datos semilla (local/staging)
`supabase/seed.sql` con: 3 líneas, 2 ejecutivos + 1 gerencia + 1 lector ficticios, 25 leads repartidos en estados, 3 conversaciones con mensajes, 2 cotizaciones, plantillas y motivos de pérdida. **Nunca** datos reales.
