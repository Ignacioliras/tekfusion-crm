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
- [ ] Atomic corriendo en local (Windows): `npm install`, `npx supabase start`, `npm run dev`, login OK.
- [ ] Subir a GitHub (privado) y verificar CI en verde con el esqueleto.
- [ ] Limpiar lo que Atomic trae y no usamos (`doc/`, `demo/`, Storybook, registro shadcn, Postmark, `companies` si no aplica), con plan aprobado. Navegación base en español (Pipeline, Leads, WhatsApp, Dashboard, Configuración).
- [ ] Conectar a Supabase staging, desplegar en Cloudflare Pages (`staging.crm.tekfusion.cl`). 🔒 Cloudflare Access delante de staging.
- [ ] Página **Créditos** (texto base) en el panel.
- [ ] 🔒 Pedir a VíaRed/DNS: SPF, DKIM y DMARC de tekfusion.cl (se verifica en Fase 7).

## Fase 2 · Datos, permisos y migración (4 días)
- [ ] Confirmar mapeo de tablas (`05`, recuadro inicial) y registrarlo en `10`. Esquema declarativo en `supabase/schemas/10_tekfusion_*.sql`; migraciones generadas con `npx supabase db diff`.
- [ ] 🔒 **RLS completa** según `08-seguridad-roles.md` y tests pgTAP (ejecutivo no ve leads ajenos; lector no edita; gerencia ve todo; service role solo en Edge/n8n). Corren en CI.
- [ ] `seed.sql` con datos ficticios (3 líneas, 4 usuarios, 60 leads en todos los estados, conversaciones, cotizaciones).
- [ ] Auth: login, recuperación, creación de usuarios desde Configuración, roles. 🔒 TOTP obligatorio para gerencia; contraseña mínima 12; protección contra contraseñas filtradas activada.
- [ ] Importador CSV (RF-15) con mapeo, dedupe y reporte de resultado; probar con una copia **anonimizada** del Sheets.
- [ ] Revisar Security Advisor de Supabase: cero avisos de nivel error.

## Fase 3 · CRM (7 días)
- [ ] Rediseño visual: identidad TekFusion, navegación (Pipeline, Leads, WhatsApp, Dashboard, Configuración), estados vacíos y mensajes en español.
- [ ] Pipeline kanban + lista con filtros, búsqueda global y export CSV (RF-04). Motivo de pérdida obligatorio.
- [ ] Ficha del lead con línea de tiempo unificada (RF-05). 🔒 Correos mostrados sanitizados (DOMPurify, lista blanca); WhatsApp siempre texto plano.
- [ ] Cotizaciones: subir PDF, monto, versiones; "Enviar cotización" por correo (Edge `email-send`) y WhatsApp (Edge `whatsapp-send`); cambio automático a `cotizado` y programación de seguimientos (RF-06). 🔒 Validación de tipo/tamaño de adjuntos, nombre regenerado.
- [ ] Programador de seguimientos por lead: ver, ajustar, cancelar; plantillas (RF-07, parte UI).
- [ ] Panel de alertas (campana) y marcado de leídas (RF-09, parte UI).
- [ ] Configuración completa (RF-14) salvo WhatsApp. 🔒 "Dar de baja usuario" con el checklist de `08`.
- [ ] Ingreso manual de lead.
- [ ] 🔒 RF-17: "Anonimizar contacto" (gerencia) y aviso de privacidad para el formulario web.
- [ ] 🔒 Sentry en el frontend.
- [ ] Tests e2e (Playwright) de: login, crear lead, mover en kanban, enviar cotización con seed.

## Fase 4 · Bandeja de WhatsApp (6 días)
- [ ] Edge Function `whatsapp-webhook` con validación `apikey`, zod, idempotencia, adjuntos a Storage, creación de conversación y disparo del flujo 02. Tests escritos antes (TDD).
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
- [ ] Vistas SQL (`vista_dashboard_mensual`, `vista_ranking_ejecutivos`).
- [ ] Dashboard con filtros de fecha; versión sin ranking para ejecutivo/lector.
- [ ] Verificar números contra los datos semilla a mano.

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
