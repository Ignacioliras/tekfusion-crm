# 10 · Registro de decisiones (ADR)

Formato: fecha · decisión · motivo · alternativas descartadas · consecuencias. Las nuevas van al final.

## 2026-10-09 · WhatsApp con Evolution API (Baileys), no API oficial de Meta
- **Motivo:** evitar plantillas aprobadas por Meta para seguimientos y simplificar la puesta en marcha.
- **Descartado:** Cloud API oficial (plantillas obligatorias fuera de 24 h; verificación de Meta Business).
- **Consecuencias:** riesgo de bloqueo del número (aceptado por TekFusion y escrito en el acuerdo); reglas anti-bloqueo obligatorias; fallback a Cloud API vía Evolution documentado.

## 2026-10-09 · Bandeja de WhatsApp dentro del CRM, uso desde computador
- **Motivo:** una sola pantalla para el ejecutivo; medición real de tiempos de respuesta; experiencia previa negativa con chats móviles de plataformas.
- **Descartado:** Chatwoot aparte (dos pantallas; sin pipeline); responder desde el celular vía dispositivos vinculados (queda como opción futura).
- **Consecuencias:** el celular solo recibe avisos; no se construye app móvil.

## 2026-10-13 · Modelo comercial
- Desarrollo $1.200.000 + IVA (50/50), **el sistema queda a nombre de TekFusion**; plan de mantención opcional $100.000 + IVA/mes (plataforma + mantención + soporte), 2 primeros meses incluidos desde la entrega; sin permanencia; mejoras se cotizan aparte. Si no toman el plan, asumen plataforma y fallas sin soporte de Libux.
- **Consecuencia técnica:** todas las cuentas a nombre de TekFusion desde el inicio; checklist de traspaso.

## 2026-10-14 · Base del CRM: Atomic CRM (MIT)
- **Motivo:** mismo stack (React + Supabase), licencia MIT que permite rediseñar y entregar como propio, base pequeña y activa.
- **Descartado:** GoHighLevel (WhatsApp oficial, costo mensual alto, no es propiedad del cliente); Twenty (AGPL, permisos por fila de pago); Frappe (AGPL, Python); NocoBase y Evo CRM (licencia/marca impiden entregarlo como propio); EspoCRM/SuiteCRM (obligan a mostrar su marca). Ver informe "CRM open source para TekFusion".
- **Consecuencias:** reemplazar las RLS por defecto de Atomic antes de cargar datos; página Créditos con componentes de terceros.

## 2026-10-14 · Stack definitivo
- Supabase Pro + Edge Functions para el receptor de WhatsApp; n8n en VPS para automatizaciones; Cloudflare Pages para hosting (Vercel Free no permite uso comercial); Claude Haiku para clasificación; Uptime Kuma para monitoreo.
- **Regla:** mensajes de WhatsApp no pasan por n8n para guardarse.

## 2026-10-28 · Correo de ejecutivos por IMAP/SMTP (VíaRed) y Gmail por contraseña de aplicación
- **Motivo:** seguimientos a nombre del ejecutivo y detección de respuestas; Gmail por IMAP evita el vencimiento de OAuth en modo prueba.
- **Pendiente:** confirmar que el plan de VíaRed permite IMAP y que SPF/DKIM están activos.

## 2026-11-01 · Rol de Grok Bot en el proyecto
- Grok Bot no construye el CRM. Se usa solo como herramienta interna de Libux: QA en staging, scribe de decisiones en Notion, redacción del manual, reporte narrativo semanal, borradores. Nunca toca producción, clientes reales ni credenciales. Datos de TekFusion no entran al cerebro de Libux. Clasificación de leads se queda con Haiku vía n8n. Ver `12-equipo-agentes.md`.

## 2026-11-02 · Seguridad ampliada y controles automáticos
- **Motivo:** la base de `08` cubría RLS, secretos y datos, pero no servidor, cuentas, contenido externo, correo ni respaldos fuera del proveedor. Un CRM que muestra correos y WhatsApp de desconocidos necesita sanitización explícita.
- **Decisiones:** 2FA en cuentas y TOTP para gerencia; VPS sin puertos públicos; sanitización de contenido externo; Turnstile; SPF/DKIM/DMARC como requisito previo a seguimientos; respaldos semanales a Cloudflare R2 con prueba de restauración cronometrada; Sentry; plan de incidente; RF-17 (ley 21.719) incluido sin costo.
- **Controles:** hooks de Claude Code (`.claude/hooks/`), lefthook + gitleaks, CI con pgTAP, Dependabot, plantilla de PR. Tareas 🔒 con nombre en `09`.
- **Consecuencias:** +1 día en Fase 1, +0,5 en Fase 3 y Fase 5. Dentro de las 7 semanas.

## 2026-11-02 · Cuentas creadas por Libux mientras TekFusion no entregue accesos
- **Motivo:** no detener la Fase 1 por la tarjeta o el DNS. GitHub, Supabase (free para staging) y Cloudflare se crean en cuenta de Libux y se **transfieren** a TekFusion (GitHub: transferir repo; Supabase: transferir proyecto a su organización; Cloudflare: cambiar de cuenta antes de producción).
- **Regla:** producción jamás se crea en cuenta de Libux. Registrar aquí la fecha de cada transferencia.

## 2026-11-02 · Mejoras propuestas, no comprometidas
- Las 11 mejoras listadas en `02-requisitos-funcionales.md` quedan fuera del alcance hasta que Ignacio decida cuáles entran. No se construyen "porque es fácil".

## 2026-11-03 · Repo creado sobre Atomic CRM y fusión con su tooling
- **Base:** marmelab/atomic-crm @ `251d3cccf4dc35c9f53036057bdf558dc2e108ba` (2 nov 2026), sin su historial. `LICENSE.md` (MIT) se conserva tal cual.
- **Hallazgo:** Atomic ahora trae su propio sistema de agentes para Claude Code (orquestador + 6 agentes, ~30 hooks, reglas y skills), pensado para su devcontainer Linux. Sus reglas exigen inglés en todo archivo commiteado y prohíben correr validaciones a mano.
- **Decisión:** se desactiva la orquestación (movida a `.claude/_atomic-harness/`, no se carga) y se conservan sus skills de código (`backend-dev`, `frontend-dev`, `shadcn-customization`, `update-branding`, `e2e-conventions`, `playwright-testing`, `ponytail*`) y sus hooks útiles (`bash-guard`, `pre-pr-checks`, `format-on-write`, `check-typescript-shortcuts`). Metodología: sigue siendo agent-skills (Addy Osmani).
- **Ajustes:** pre-commit con husky + lint-staged de Atomic (no lefthook) + gitleaks; `make` reemplazado por scripts npm (Windows); CI = `check.yml` de Atomic + `seguridad.yml` nuestro (gitleaks, pgTAP, npm audit); se retiran `deploy.yml` (doc de Atomic en GH Pages) y `claude.yml` (bot @claude) — guardados en `docs/atomic/`.
- **Modelo de datos:** reutilizar tablas de Atomic (`deals`=lead, `sales`=ejecutivo, `contacts`, `companies`) y nombres nuevos en inglés; esquema declarativo en `supabase/schemas/`. Mapeo en `05-modelo-datos.md`. Se confirma en Fase 2.
- **Idioma:** código en inglés; interfaz en español vía i18n (Atomic trae inglés y francés con `ra-i18n-polyglot`; agregar mensajes `es` en Fase 3); docs y commits en español.
- **Entorno:** Windows nativo en `D:\Tekfusion\tekfusion-crm`. Plan B si algún hook o script falla en Windows: el `.devcontainer/` de Atomic o WSL2.
- **Node:** 24 (`.nvmrc` de Atomic), no 20.

## 2026-11-03 · Sesiones nocturnas como loop por tareas
- **Motivo:** un solo `claude -p` con toda la lista se traba a la mitad y se pierde el resto; además el contexto se degrada. El patrón probado en la comunidad ("Ralph loop") es una corrida por tarea con contexto limpio, estado en disco y verificación fuera del agente.
- **Decisión:** `scripts/tekfusion/nocturno.mjs` (Node, Windows y Mac): cola JSON por noche, una corrida de `claude -p --output-format json` por tarea con `--max-turns`, `--max-budget-usd`, `--permission-prompts none` y herramientas acotadas; verificación la corre el script; commit si pasa, `reset --hard` + reintento con el error si falla; `BLOQUEADA:` para decisiones; dependencias entre tareas; reporte y `session_id` para retomar. Comandos `/nocturno` (arma la cola desde `docs/09`) y `/manana` (revisión).
- **Descartado:** plugin `ralph-loop` oficial (menos control sobre verificación y reporte) y `--dangerously-skip-permissions` (en un PC real, no).
- **Probado:** con un `claude` simulado, los casos hecha / falla+reintento / bloqueada / dependencia caída / Supabase apagado / Claude que no arranca.

## 2026-11-03 · Decisiones de las colas nocturnas (T2, T3, T5, T7, T8)
- **Motivo:** de noche, Claude tomó decisiones que no estaban registradas; Ignacio las revisó en la mañana.
- **T7/T8 · zod:** `supabase/functions/_shared/leadClassification.ts` y `evolutionWebhook.ts` quedaron con validación manual porque el proyecto vitest `functions` no tiene alias para `npm:zod`. **Decisión:** se migran a zod hoy (alias de `npm:zod` en `vitest.config.ts`), como pide CLAUDE.md §4 y la tarea de la Fase 4.
- **T2 · DealsChart:** la barra "pendiente" pondera los leads abiertos con la rampa heredada de Atomic (nuevo 0,2 / contactado 0,5 / cotizado 0,8) y la barra "perdido" suma `perdido` + `archivado`. **Decisión:** queda así hasta que TekFusion defina el criterio; la pregunta está en `11-pendientes-kickoff.md` (Reglas).
- **T3 · Idioma:** el español como idioma por defecto se adelanta a la Fase 1 (la decisión anterior lo ubicaba en Fase 3) y **queda**. *Corrección del mismo día:* T3 había cambiado `src/lib/i18nProvider.ts`, que el CRM no usa (`<CRM>` trae su propio proveedor en `providers/commons/i18nProvider.ts`), así que la interfaz seguía en inglés. Ahora ese proveedor tiene catálogo `es` (claves `ra.*` y `crm.*`/`resources.*` en `src/lib/i18n/es.ts`, tipadas contra `englishCrmMessages`) y el CRM parte en español sin importar el idioma del navegador (se quitó `getInitialLocale`); inglés y francés quedan en el menú. Lo que no tenga traducción cae a inglés. Las claves nuevas se agregan en inglés y francés también, porque el catálogo francés está tipado como completo.
- **T5 · Seed:** mientras `sales` no tenga `role`, "lector" y "ejecutivo" solo se distinguen por `administrator=false`; se resuelve con la RLS de la Fase 2. Contraseña local de los 4 usuarios ficticios: `demo-tekfusion` (solo local/staging). El trigger `20_contact_saved` (Gravatar por HTTP) se desactiva durante la carga para no llamar a servicios externos.
- **Gitleaks:** el dato de prueba `secreto-de-prueba-123` del test del webhook (T8) es un falso positivo de la regla `generic-api-key`. Se marca con `gitleaks:allow` en la línea y su huella histórica (commit 986ba13) se registra en `.gitleaksignore`.
- **Tests del harness:** el proyecto vitest `claude` (tests de los hooks del harness de Atomic) fallaba entero, también en `main`, porque prueba un sistema que está desactivado. **Decisión:** los tests del harness quedan fuera junto con el harness: se quita el proyecto `claude` de `vitest.config.ts` y el script `test:unit:claude`. `test:unit:app` corre solo `app` y `functions`. Si algún día se reactiva el harness, se reactivan sus tests.

## 2026-11-03 · Menú móvil igual al de escritorio
- **Decisión:** la barra inferior móvil tiene los mismos 7 ítems y el mismo orden que el header (Pipeline, Leads, Contactos, Empresas, WhatsApp, Dashboard, Configuración), con scroll horizontal en vez de esconder ítems; el botón "+" (crear contacto, nota o tarea) queda al final.
- **Regla dura 9:** no se construyen flujos móviles: en pantalla chica se reutilizan las pantallas de escritorio (kanban, lista de leads, lista de empresas, WhatsApp).
- **Consecuencias:** "Tareas" ya no está en la barra móvil (no está en el menú de escritorio); la ruta `/tasks` sigue existiendo en móvil.

## 2026-11-03 · Fase 2: modelo de datos y RLS (propuesta aprobada)
- **Fuente:** `docs/fase-2-propuesta.md`, aprobada por Ignacio con las 5 recomendaciones.
- **1 · Ids `bigint`:** las tablas nuevas usan `bigint generated by default as identity`, como Atomic; no `uuid` como decía `05`. Descartado `uuid`: claves foráneas heterogéneas y cambios en el data provider sin ganar seguridad (la protege la RLS).
- **2 · `sales.role` es la fuente de verdad del rol** (`manager` / `executive` / `reader`); `sales.administrator` se mantiene y un trigger lo sincroniza (`administrator = (role = 'manager')`) para que las pantallas de Atomic sigan reconociendo a gerencia. Solo gerencia cambia `role`, `administrator` y `disabled`.
- **3 · Borrado:** solo gerencia y **solo en `contacts` y `companies`** (lo necesita `merge_contacts` y la importación). `deals`, `wa_messages`, `wa_conversations` y `quotes` **nunca se borran**: no tienen policy de delete; se anonimizan (RF-17).
- **4 · "Tomar" un lead:** un ejecutivo puede tomar un lead sin asignar mediante la RPC `take_deal(deal_id)`; queda registrado y avisa a gerencia. Reasignar leads ya asignados sigue siendo solo de gerencia.
- **5 · Empresas visibles para todo usuario interno** (lectura); escritura gerencia y ejecutivos; borrado solo gerencia. Los datos personales viven en `contacts`, que sí queda restringido.
- **Consecuencias:** las policies `using (true)` de Atomic se eliminan de `05_policies.sql` (no se apilan). Valores de enum en español, iguales a los de la interfaz. "Ganado exige monto" y "perdido exige motivo" se agregan en Fase 3 con su pantalla.

## 2026-11-03 · Endurecimiento tras la revisión de la Fase 2 (security-reviewer + database-reviewer)
- **Motivo:** los dos agentes de ECC revisaron `main..fase-2/datos` con el encargo de Ignacio. Los 6 puntos pedidos salieron OK; lo que sigue son sus hallazgos, todos corregidos con test pgTAP (`supabase/tests/15_rls_endurecimiento.test.sql` y nuevas aserciones en `14_rls_cobertura`).
- **Alto (database-reviewer):** un ejecutivo podía traerse un contacto ajeno agregándolo a `contact_ids` de su propio lead y desde ahí leerlo y editarlo. Trigger `guard_deal_contact_ids`: un ejecutivo solo enlaza contactos propios o sin dueño; `protect_contact_owner`: no crea contactos a nombre de otro ni los reasigna (solo gerencia).
- **Medio (security-reviewer):** un usuario desactivado con JWT vigente podía quitarse su propio ban por la Edge Function `users`; además `disabled ?? false` reactivaba a quien se editara sin ese campo. La función rechaza usuarios desactivados y solo cambia el ban cuando un administrador lo manda explícitamente (`_shared/activeSale.ts`, con test).
- **Grants:** `anon` queda solo con `select` sobre `init_state` (login); `authenticated` sin `TRUNCATE/REFERENCES/TRIGGER`; en `sales` solo escribe por PostgREST las columnas de perfil más las tres que protege el trigger (`email`, `user_id`, `secondary_emails` quedan fuera); las funciones nuevas no son ejecutables por `anon`/PUBLIC; privilegios por defecto de `postgres` en `public` sin `anon`. Todo en `12_tekfusion_grants.sql`.
- **Otros:** siempre queda al menos un manager activo (trigger `ensure_active_manager`); `take_deal` excluye leads archivados; la puerta de los triggers de guarda es el rol de conexión, no `auth.uid()`; las policies de Storage exigen usuario interno (el bucket sigue público hasta las URLs firmadas de la Fase 3); `activity_log` ya no expone `raw_source`; las policies usan `contact_ids @> array[id]` (usa el índice GIN) y llaman los helpers como `(select fn())` para evaluarlos una vez por consulta; FKs con `on delete` explícito e índices para las policies.
- **No se hizo (fuera de alcance):** bucket privado con URLs firmadas (Fase 3); `enable_signup = false` en producción se decide al crear el proyecto; interfaz para el rol lector (ítem "Auth: roles" de la Fase 2).

## Plantilla para nuevas decisiones
```
## AAAA-MM-DD · Título
- **Motivo:**
- **Descartado:**
- **Consecuencias:**
```
