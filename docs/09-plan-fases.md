# 09 · Plan por fases

Kickoff: 28 de octubre de 2026. Plazo comprometido: **7 semanas** (salida a producción estimada: semana del 15 de diciembre de 2026). Días = días hábiles a jornada completa. Marcar `[x]` al terminar; anotar fecha.

**Definición de terminado (DoD) para cada tarea:** funciona en staging con datos semilla, pasa lint/typecheck/tests en CI, está documentado si cambió el modelo o un flujo, y quedó registrada cualquier decisión. Las tareas con 🔒 vienen de `08-seguridad-roles.md` y no se posponen.

**Estimación realista:** 4–5 semanas de construcción a jornada completa; el resto son esperas de TekFusion (accesos, decisiones, número de WhatsApp, QA). Las sesiones nocturnas (ver `14-herramientas-claude-code.md`) sirven en Fases 2, 3 y 6; casi nada en 4 y 5.

## Fase 0 · Accesos (TekFusion, en paralelo) — ver `11-pendientes-kickoff.md`

## Fase 1 · Infraestructura (3 días)
- [ ] Cuentas a nombre de TekFusion: GitHub (repo privado, `main` protegida), Supabase (`tekfusion-staging` y `tekfusion-prod`, Pro en prod), Cloudflare (Pages + DNS + R2 `tekfusion-backups`), Hostinger VPS 8 GB, Anthropic API (con tope de gasto). *Si TekFusion aún no entrega tarjeta/accesos: crear en cuenta de Libux y transferir (registrar en `10-decisiones.md`).*
- [ ] 🔒 2FA en todas las cuentas; bóveda Bitwarden "TekFusion CRM" con códigos de recuperación.
- [ ] VPS: Docker + Compose, `ufw` (solo 22/80/443), SSH solo con llave y sin root, `fail2ban`, `unattended-upgrades`, Caddy con HTTPS, `infra/docker-compose.yml` con Evolution, n8n y Uptime Kuma **sin puertos públicos**, imágenes fijadas a versión. Documentar en `infra/README.md`.
- [ ] Evolution staging conectada a un número de prueba de Libux; webhook apuntando a la Edge Function de staging; `/manager` solo en staging.
- [ ] n8n con auth propia y credenciales de staging; Uptime Kuma con los 5 checks y 🔒 avisos a Telegram/WhatsApp de Libux.
- [x] Repo creado sobre Atomic CRM con el kit fusionado (2026-11-03): `.env.example`, `.gitignore`, `.gitattributes`, `README.md`, hooks de Claude Code (`.claude/settings.json`), pre-commit husky + gitleaks, CI (`check.yml` + `seguridad.yml`), Dependabot, plantilla de PR.
- [x] Atomic corriendo en local (Windows): `npm install`, `npx supabase start`, `npm run dev`, login OK. (2026-11-03, con el seed ficticio y los 4 usuarios de `docs/16`)
- [ ] Subir a GitHub (privado) y verificar CI en verde con el esqueleto.
- [ ] Limpiar lo que Atomic trae y no usamos (`doc/`, `demo/`, Storybook, registro shadcn, Postmark, `companies` si no aplica), con plan aprobado. Navegación base en español (Pipeline, Leads, WhatsApp, Dashboard, Configuración). *En progreso (2026-11-03): hechos `doc/`, Postmark, Storybook, `mcp`/OAuth, workflows guardados, navegación y español; faltan `demo/` y el registro shadcn; `companies` se queda (B2B). Estado en `docs/atomic/inventario-limpieza.md`.*
- [ ] Conectar a Supabase staging, desplegar en Cloudflare Pages (`staging.crm.tekfusion.cl`). 🔒 Cloudflare Access delante de staging.
- [x] Página **Créditos** (texto base) en el panel. (2026-11-03, nocturno T4: `creditos/CreditosPage.tsx`, enlazada desde el menú de usuario)
- [ ] 🔒 Pedir a VíaRed/DNS: SPF, DKIM y DMARC de tekfusion.cl (se verifica en Fase 7).

## Fase 2 · Datos, permisos y migración (4 días)
**Cerrada el 2026-11-03** (ramas fase-2/datos, fase-2/usuarios y fase-2/seguridad mergeadas en `main`), salvo tres ítems que solo existen en el panel de Supabase y se hacen al crear cada proyecto en la nube (checklist en `docs/16`): protección contra contraseñas filtradas (HaveIBeenPwned), Security Advisor sin avisos de nivel error y rate limit de MFA.
- [x] Confirmar mapeo de tablas (`05`, recuadro inicial) y registrarlo en `10`. Esquema declarativo en `supabase/schemas/10_tekfusion_*.sql`; migraciones generadas con `npx supabase db diff`. (2026-11-03: `docs/fase-2-propuesta.md` aprobada; `10_tekfusion_tables.sql` + migración; revisada con security-reviewer y database-reviewer, mergeada a `main`)
- [x] 🔒 **RLS completa** según `08-seguridad-roles.md` y tests pgTAP (ejecutivo no ve leads ajenos; lector no edita; gerencia ve todo; service role solo en Edge/n8n). Corren en CI. (2026-11-03: `11_tekfusion_policies.sql`, 119 aserciones en `supabase/tests/10_rls_*` a `15_rls_*`; endurecimiento en `12_tekfusion_grants.sql`; mergeada a `main`)
- [x] `seed.sql` con datos ficticios (3 líneas, 4 usuarios, 60 leads en todos los estados, conversaciones, cotizaciones). *Hecho lo de esta fase; conversaciones y cotizaciones se siembran en las Fases 3 y 4 con sus tablas. Detalle:  (2026-11-03, nocturno T5): 4 usuarios, 12 empresas, 20 contactos y 60 leads (10 por etapa). Fase 2 (fase-2/datos): roles, líneas de negocio, motivos de pérdida, línea/canal/confianza por lead, 8 tareas, 5 contactos calientes, 10 notas, 3 leads sin asignar. Faltan conversaciones y cotizaciones (Fases 3 y 4).*
- [x] Auth: login, recuperación, creación de usuarios desde Configuración, roles. 🔒 TOTP obligatorio para gerencia; contraseña mínima 12; protección contra contraseñas filtradas activada (en el panel de la nube, ver arriba). *Hecho (2026-11-03, fase-2/usuarios y fase-2/seguridad): Configuración → Usuarios con rol, línea, suplente y ausencias, editable solo por gerencia; el lector no ve botones de crear, editar ni borrar. Contraseña mínima 12 con letras y números en `config.toml` (2026-11-03). HaveIBeenPwned y Security Advisor se activan en el panel al crear cada proyecto en la nube (`docs/16`). TOTP con QR, obligatorio para gerencia, verificación al entrar, exigido también en la base (2026-11-03). "Dar de baja usuario" con el checklist de `08` (adelantado de la Fase 3). Revisado con security-reviewer; el rate limit de MFA va en el panel de la nube.*
- [x] Importador CSV (RF-15) con plantilla fija, dedupe y reporte de resultado. *Hecho (2026-11-03, fase-2/usuarios): importador de leads con línea, etapa, ejecutivo por correo, dedupe por correo/teléfono y reporte; probado con `test-data/leads-30.csv` (30 filas ficticias: 25 creadas, 3 duplicadas, 2 errores). La prueba con la copia anonimizada del Sheets real queda en el ensayo de migración de la Fase 7.*
- [ ] ☁️ Panel de la nube, al crear staging y producción (`docs/16`): HaveIBeenPwned, Security Advisor sin avisos de nivel error, rate limit de MFA (challenge/verify).
- [x] 🔒 Adjuntos privados: bucket cerrado, URLs firmadas de 60 min, policy por lead/contacto visible (2026-11-03, fase-2/seguridad; adelantado de la Fase 3).

## Fase 3 · CRM (7 días)
- [x] Esquema de la fase: `quotes`, `followups`, `templates`, `alerts`, `quick_replies` y bucket privado `quotes`, con RLS, grants, índices, tests pgTAP (`20_`–`23_`) y seed ficticio (15 cotizaciones, 20 seguimientos, 10 alertas). *Hecho (2026-11-03, fase-3/esquema); decisiones en `docs/10`.*
- [ ] Rediseño visual: identidad TekFusion, navegación (Pipeline, Leads, WhatsApp, Dashboard, Configuración), estados vacíos y mensajes en español.
- [x] Pipeline kanban + lista con filtros, búsqueda global y export CSV (RF-04). Motivo de pérdida obligatorio. *(2026-11-03, fase-3/ficha): ganado exige monto y perdido exige motivo (más nota opcional), en la ficha y al arrastrar en el kanban; regla también en la base (`guard_deal_closing`). (2026-11-04, nocturno T6): filtros por línea, ejecutivo, canal, etapa (tabla) y fecha de creación; búsqueda global probada; export CSV solo gerencia (`canAccess`). (2026-11-05, fase-3/ajustes): Exportar oculto para ejecutivo y lector en toda lista (los botones consultan `canAccess`) y cada export registrado con autor, recurso, filas y filtros (RPC `log_export` → `audit_log`, pgTAP `29_log_export`; T3 de la cola 2026-11-04-b, bloqueada de noche).*
- [ ] Ficha del lead con línea de tiempo unificada (RF-05). 🔒 Correos mostrados sanitizados (DOMPurify, lista blanca); WhatsApp siempre texto plano. *Hecho lo de esta fase (2026-11-03, fase-3/ficha): línea de tiempo con notas, cambios de etapa y de ejecutivo, cotizaciones, seguimientos y alertas; datos editables en línea; acciones Enviar cotización, Programar seguimiento, Marcar contactado, Ganado/Perdido, Reasignar (gerencia) y Tomar. Captura `docs/capturas/ficha-lead-camila.png`. Queda abierta hasta sumar correos y WhatsApp (Fases 4 y 5), con el 🔒 de sanitizado.*
- [x] Cotizaciones: subir PDF, monto, versiones; "Enviar cotización" por correo y WhatsApp; cambio automático a `cotizado` y programación de seguimientos (RF-06). 🔒 Validación de tipo/tamaño de adjuntos, nombre regenerado. *Hecho (2026-11-03, fase-3/ficha): diálogo con PDF (solo PDF, 15 MB, validado en la pantalla, en el bucket y en la tabla; nombre UUID), monto y canales; `send_quote` encola una fila por canal en `send_queue`, pasa a `cotizado` y programa la cadencia. El envío real lo hace n8n en la Fase 5 leyendo la cola (antes decía Edge `email-send`/`whatsapp-send`; decisión de Ignacio, 2026-11-03). Capturas `cotizacion-dialogo.png`, `cotizacion-enviada.png`.*
- [x] Programador de seguimientos por lead: ver, ajustar, cancelar; plantillas (RF-07, parte UI). *Hecho (2026-11-03, fase-3/ficha): próximo seguimiento con Ajustar/Cancelar, lista e historial, programar a mano; fecha, canales, modo automático o recordatorio, plantilla y vista previa con variables resueltas (texto plano). Captura `seguimiento-ajustar.png`.*
- [x] Panel de alertas (campana) y marcado de leídas (RF-09, parte UI). *Hecho (2026-11-04, nocturno T3): campana en el header de escritorio y en el móvil con el contador de las alertas no leídas del propio usuario (también gerencia ve solo las suyas); panel agrupado por tipo, mensaje, fecha relativa, enlace a la ficha, "Marcar leída" y "Marcar todas como leídas" (el update envía solo `read_at`). Tests en `alerts/Alerts.test.tsx`. Mergeado a `main` el 2026-11-05. Revisión de la mañana: el texto debe nombrar lead, empresa y qué pasó → `fase-3/ajustes`.*
- [x] Configuración completa (RF-14) salvo WhatsApp. *"Dar de baja usuario" ya está hecho en la Fase 2 (`offboard_sale` + Edge `users` DELETE + `audit_log`). Parcial (2026-11-04, nocturno T4): en Configuración, solo gerencia, cadencia por defecto (`followupCadenceDays`, default `[2, 5, 10]` como `send_quote`), horario hábil (`businessHours`, lun–vie 09:00–18:00), correo de facturación (`billingEmail`) y reporte semanal (`weeklyReport`: día, hora y destinatarios; default lunes 08:00 sin destinatarios, a confirmar con Ignacio), guardados en `configuration.config` con validación en español. Tests en `settings/FollowupSettings.test.tsx`. Completo (2026-11-04, nocturno T5): en Configuración, solo gerencia, catálogos de plantillas (`templates`: crear, editar, activar/desactivar; solo `{{nombre}}`, `{{empresa}}`, `{{producto}}`, `{{ejecutivo}}`, misma regla que `templates_known_variables`, con vista previa vía `followups/renderTemplate.ts`), respuestas rápidas (`quick_replies`) y motivos de pérdida (`lost_reasons`: crear, renombrar, activar/desactivar y ordenar por `position`); cada catálogo guarda por su cuenta, no con el botón Guardar de la página. Firma (`sales.signature`) editable por gerencia en Usuarios y por cada uno en Mi perfil: la Edge `users` no la transporta, así que va por `update` directo a `sales` (columna con grant en `12_tekfusion_grants.sql`). Líneas de negocio y ejecutivos ya estaban en Usuarios (Fase 2). Tests en `settings/Catalogs.test.tsx`. Mergeado a `main` el 2026-11-05; índice lateral, una sola forma de guardar, restos de Atomic y versión móvil → `fase-3/ajustes`. Avance (2026-11-05, nocturno T1): Leads → Etapas pasa a solo lectura (lista en orden desde `dealStages` con "Las etapas son fijas: las usan las reglas del CRM."; se guardan tal cual vienen de la configuración) y la tarjeta "Facturación y reporte semanal" suma la retención de leads perdidos/archivados (`dataRetentionMonths`, entero 0–120, 24 por defecto, 0 la desactiva; la anonimización programada es la tarea de RF-17). Tests en `settings/DataRetention.test.tsx`.*
- [x] Ingreso manual de lead. *Hecho (2026-11-05, nocturno T2): diálogo "Nuevo lead" (`deals/DealCreate.tsx`): producto (obligatorio), empresa con "Crear «X»" al vuelo, contacto filtrado por la empresa con alta rápida (nombre, apellido, correo y teléfono validados con `tekfusion/phone.ts`), línea sugerida con `detectarLineaPorPalabras` mientras no se elija a mano, monto opcional entero, canal fijo `manual` y etapa `nuevo`; selector de ejecutivo solo para gerencia (vacío = sin asignar; al ejecutivo lo deja dueño la base). Al guardar abre la ficha. La edición sigue con `DealInputs`. Tests en `deals/DealCreate.test.tsx`.*
- [ ] 🔒 RF-17: "Anonimizar contacto" (gerencia) y aviso de privacidad para el formulario web.
- [x] 🔒 Sentry en el frontend. *Hecho (2026-11-05, nocturno T3): `src/lib/sentry.ts` (`initSentry`) solo arranca con `VITE_SENTRY_DSN`; sin trazas, sin datos de usuario/cookies/headers/cuerpos (en Sentry v11 `sendDefaultPii` pasó a `dataCollection`) y un `beforeSend` que borra cookies, headers, correo e IP. `main.tsx` envuelve la app con `Sentry.ErrorBoundary` solo si quedó encendido. Edge Functions: `_shared/sentry.ts` (`withSentry`) importa `npm:@sentry/deno` solo con `SENTRY_DSN`, reporta la excepción que escapa y la relanza (mismo 500); lo usan `users` y `delete_note_attachments`. **Se activa al poner los DSN en la nube** (`docs/16`). Test en `src/lib/sentry.test.ts`.*
- [x] Limpiar la caché persistida de react-query (localStorage, 24 h) al cerrar sesión: en un PC compartido el siguiente usuario ve datos del anterior hasta el refetch (viene de Atomic; hallazgo B2 de la revisión de seguridad, `docs/10`). — 2026-11-04: `root/clearPersistedCache.ts` vacía el `queryClient` (registrado por `CRM.tsx`) y borra `REACT_QUERY_OFFLINE_CACHE`; lo llaman los `logout` de Supabase y FakeRest. Tests en `clearPersistedCache.test.ts`.
- [x] Completar `offboard_sale` ("Dar de baja"): reasignar también contactos y tareas del usuario, y un suplente por línea cuando tiene varias (hoy todos los leads van al suplente de la primera línea). Hallazgos Info de la revisión, `docs/10`. *Hecho (2026-11-05, fase-3/ajustes; T2 de la cola nocturna 2026-11-04, que falló de noche): cada lead abierto al suplente de su línea (o al de la primera línea), contactos al que recibió la mayoría de sus leads, tareas pendientes con su contacto, cada línea a su suplente; audit_log con leads, contactos y tareas. Migración `offboard_suplente_por_linea`, pgTAP `28_baja_por_linea` (el 17 sigue igual).*
- [ ] Tests e2e (Playwright) de: login, crear lead, mover en kanban, enviar cotización con seed.

## Fase 4 · Bandeja de WhatsApp (6 días)
- [ ] Edge Function `whatsapp-webhook` con validación `apikey`, zod, idempotencia, adjuntos a Storage, creación de conversación y disparo del flujo 02. Tests escritos antes (TDD).
- [ ] Validar con zod la entrada de la Edge Function `users` (POST, PATCH, DELETE), con el mismo `_shared` que use `whatsapp-webhook` (hallazgo B6 de la revisión de seguridad, `docs/10`).
- [ ] Edge Function `whatsapp-send` (texto, adjunto, cotización, firma) con reglas anti-bloqueo.
- [ ] Bandeja: lista (Mis chats / Sin asignar / Todos), conversación en tiempo real, estados, adjuntos, audio, respuestas rápidas, "Tomar" conversación.
- [ ] Indicador de conexión + pantalla de reconexión por QR (Configuración → WhatsApp).
- [ ] Atribución de mensajes `fromMe` escritos desde el teléfono.
- [ ] Pruebas de la lista de `07-whatsapp-evolution.md`.

## Fase 5 · Flujos de n8n (5 días)
- [ ] 01 Ingreso por correo (IMAP Gmail + IA + asignación + aviso). 🔒 Salida de Haiku validada contra esquema; nunca ejecuta acciones.
- [ ] 02 Ingreso por WhatsApp.
- [ ] 03 Motor de seguimientos (con reglas anti-bloqueo y límite por hora de VíaRed).
- [ ] 04 Detector de respuestas por correo (IMAP VíaRed por ejecutivo).
- [ ] 05 Alertas 24/48 h. 06 Archivado. 07 Ganado → facturación.
- [ ] 08 Monitoreo WhatsApp. 09 Reporte semanal. 10 Reconciliación. 11 Avisos al ejecutivo.
- [ ] 🔒 12 Respaldos: `pg_dump` semanal y Storage a R2; `rclone` diario del VPS a R2.
- [ ] Exportar todos los flujos a `n8n/flows/`. Prueba de reejecución sin duplicados.
- [ ] 🔒 **Prueba de restauración con reloj** en staging (base + Storage + n8n + Evolution). Anotar tiempos en `10-decisiones.md`.
- [ ] Medir precisión del clasificador con los 50 correos etiquetados por TekFusion (objetivo ≥ 90 % en línea correcta; si no, ajustar prompt/palabras clave).

## Fase 6 · Dashboard de gerencia (3 días)
- [x] Vistas SQL (`vista_dashboard_mensual`, `vista_ranking_ejecutivos`). Hechas `dashboard_monthly` y `sales_ranking` (2026-11-04, `13_tekfusion_dashboard.sql`, tests `25_dashboard_monthly` y `26_sales_ranking`); por día (`dashboard_daily`, `sales_ranking.day`, test `25_dashboard_daily`) el 2026-11-05 en `fase-3/ajustes`.
- [ ] Dashboard con filtros de fecha; versión sin ranking para ejecutivo/lector. Métricas (2026-11-04, `management-dashboard/ManagementDashboard.tsx` + `metrics.ts`, arriba del dashboard de Atomic para todos los roles, filtro desde/hasta por mes vs período anterior) y ranking de ejecutivos (2026-11-04, `management-dashboard/SalesRanking.tsx` + `rankSales` en `metrics.ts`, mismo rango, ordenado por monto ganado; solo gerencia con `useCanAccess({ resource: 'sales', action: 'list' })`: ejecutivo y lector no ven la sección ni consultan `sales_ranking`). Tests `SalesRanking.test.tsx` y `metrics.test.ts`. Mergeado a `main` el 2026-11-05. Reabierto: el filtro pasa a rango por días con atajos y defecto "Últimos 30 días" (decisión de Ignacio, 2026-11-05, `docs/10`) → `fase-3/ajustes`.
- [x] Verificar números contra los datos semilla a mano. Cubierto por pgTAP `25_dashboard_daily` y `26_sales_ranking` (vistas contra el seed). Capturas como Andrea y Camila tomadas el 2026-11-05 (revisión de la mañana).

## Fase 7 · Pruebas, marcha blanca y entrega (6 días)
- [ ] Pruebas end-to-end en staging (flujo completo: entra correo → lead → asignación → cotización → seguimientos → respuesta → ganado → facturación).
- [ ] 🔒 Revisión de seguridad con `security-reviewer` + checklist de `08`: RLS, secretos, URLs firmadas, service role, sanitización, puertos del VPS, 2FA, respaldos en R2.
- [ ] 🔒 `docs/incidente.md` (plan de una página) y `docs/corte.md` (plan de go-live: fecha, hora, qué pasa con correos durante el cambio, quién avisa, cómo se vuelve atrás).
- [ ] Producción: proyecto Supabase prod, Evolution prod con el número corporativo (QR escaneado por TekFusion), n8n prod, DNS `crm.tekfusion.cl`. 🔒 SPF/DKIM/DMARC verificados en mxtoolbox.
- [ ] Ensayo de migración en staging con el CSV real → TekFusion valida que los números cuadran. Luego migración real (con TekFusion presente).
- [ ] **Marcha blanca 1 semana** en paralelo con su sistema actual. Calentamiento del número: volumen bajo, seguimientos automáticos apagados los primeros 10 días.
- [ ] Manual de usuario (ejecutivo y gerencia), guía de reconexión de WhatsApp, 4 videos de 3 minutos.
- [ ] Capacitación (2 sesiones: ejecutivos y gerencia). Acta de entrega firmada. Factura del segundo 50 %.
- [ ] Entrega de accesos y documentación a TekFusion; checklist de traspaso en `13-acuerdo-comercial.md`.

## Orden recomendado de ataque (riesgo primero)
1. RLS correcta (Fase 2) antes de cualquier dato real.
2. Receptor de WhatsApp en un número de prueba (Fase 4) lo antes posible: es la pieza más riesgosa.
3. SPF/DKIM/DMARC de tekfusion.cl pedidos en la semana 1 para que los seguimientos no caigan en spam.
4. Página Créditos desde la Fase 1.

## Rituales de trabajo
- **Lunes a jueves, mañana:** `/estado`, revisar commits de la noche, CI, mergear lo que pasó, descartar lo que no.
- **Día:** `/plan` de la tarea → construir → PR chico → CI en verde → merge. Decisión nueva → `10-decisiones.md`.
- **Tarde:** dejar `docs/nocturno/AAAA-MM-DD.md` con tareas cerradas y sus tests; `/handoff`.
- **Viernes:** demo de 30 min en staging con la contraparte de TekFusion → **acta de aceptación de la semana** (correo con lo demostrado y lo aprobado) → lo que pidan entra como issues en GitHub, no por WhatsApp.
- **Nunca:** producción un viernes, ni desde una sesión nocturna.

## Hitos de demo semanal (viernes)
| Semana | Demo | Acta |
|---|---|---|
| 1 | Staging arriba, login, estructura | [ ] |
| 2 | Pipeline + ficha + importación con datos ficticios | [ ] |
| 3 | Cotización y seguimientos desde el CRM | [ ] |
| 4 | Bandeja de WhatsApp funcionando con número de prueba | [ ] |
| 5 | Leads entrando solos por correo y WhatsApp; alertas | [ ] |
| 6 | Dashboard + reporte semanal; inicio marcha blanca | [ ] |
| 7 | Producción, capacitación, entrega | [ ] |
