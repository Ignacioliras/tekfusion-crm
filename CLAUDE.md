# CRM TekFusion — Guía para Claude Code

Este repositorio contiene el sistema comercial a medida que Libux construye para TekFusion
(empresa chilena B2B que vende válvulas, tuberías y geoceldas/geosintéticos).
Lee este archivo completo antes de tocar código. La documentación de detalle está en `docs/`.

## 1. Qué estamos construyendo (resumen)

Un CRM web, de uso principal desde computador, que:
1. Recibe consultas (leads) desde correo, formulario web, bot del sitio y WhatsApp, y las registra solas.
2. Clasifica cada lead por línea de negocio (válvulas / tuberías / geoceldas) y lo asigna al ejecutivo responsable.
3. Permite cotizar y enviar la cotización (PDF) desde el CRM, por correo y/o WhatsApp.
4. Ejecuta seguimientos automáticos programables, a nombre del ejecutivo, por correo y WhatsApp, y los detiene cuando el cliente responde.
5. Incluye una bandeja de WhatsApp dentro del CRM (número corporativo único, acceso por usuario).
6. Alerta: lead sin contacto en 24 h, seguimiento vencido, cliente respondió, WhatsApp desconectado, lead por archivar.
7. Entrega a gerencia un dashboard con métricas, ranking privado de ejecutivos y reporte semanal automático.

Documentos clave: `docs/01-contexto-negocio.md`, `docs/02-requisitos-funcionales.md`, `docs/03-reglas-negocio.md`.

## 2. Stack (no cambiar sin registrar una decisión en `docs/10-decisiones.md`)

| Capa | Herramienta |
|---|---|
| Base del CRM | Atomic CRM (marmelab, licencia MIT), clonado y rediseñado |
| Frontend | React + TypeScript + Vite + Tailwind + shadcn/ui |
| Base de datos, auth, storage, realtime | Supabase (plan Pro) |
| Receptor de WhatsApp | Supabase Edge Function (webhook de Evolution → tabla `mensajes`) |
| WhatsApp | Evolution API (Docker, VPS) — conexión Baileys por QR; fallback: Cloud API vía Evolution |
| Automatizaciones | n8n (Docker, mismo VPS) |
| Correo | IMAP/SMTP de VíaRed (casillas @tekfusion.cl) y Gmail de marketing por IMAP con contraseña de aplicación |
| IA | Claude Haiku vía API (clasificación de línea y extracción de datos del correo) |
| Hosting web | Cloudflare Pages |
| Monitoreo | Uptime Kuma (VPS) |
| Servidor | VPS 8 GB (Hostinger) |
| Dominio | crm.tekfusion.cl |

Detalle en `docs/04-arquitectura.md`.

## 3. Reglas duras (no negociables)

1. **Los mensajes de WhatsApp nunca pasan por n8n para guardarse.** Evolution → Edge Function → Supabase. n8n solo automatiza sobre datos ya guardados. Si n8n se cae, el chat sigue funcionando.
2. **Cero duplicados de mensajes.** Cada mensaje se guarda con su `wa_message_id` único (restricción UNIQUE). Reintentos del webhook no crean filas nuevas.
3. **Permisos desde el día uno.** Antes de cargar un solo dato real, las políticas RLS deben estar activas: un ejecutivo ve solo sus leads y conversaciones; gerencia ve todo; lector solo lee. Atomic CRM viene con RLS que deja ver todo a cualquier usuario logueado: eso se reemplaza en la Fase 2, no después.
4. **Ningún envío automático sin respetar las reglas anti-bloqueo** (`docs/07-whatsapp-evolution.md`): horario hábil, envíos espaciados, tope diario, mensajes personalizados, nunca masivos.
5. **Nada de datos reales de TekFusion en ambientes de prueba ni en herramientas externas** (Notion de Libux, bots, chats de IA). Staging usa datos ficticios y un número de WhatsApp de prueba de Libux.
6. **Las cuentas (Supabase, VPS, Cloudflare, GitHub, dominio) son de TekFusion**, administradas por Libux. No crear recursos en cuentas personales.
7. **Nunca commitear secretos.** Variables en `.env` (ver `.env.example`); `.env` está en `.gitignore`. Si una clave se filtró, se rota de inmediato.
8. **Página "Créditos" obligatoria** en el panel de administración, que informe que el sistema usa Evolution API (condición de su licencia) y liste los componentes de terceros con sus licencias.
9. **No prometer ni construir app móvil.** El CRM es desktop-first. El celular solo recibe avisos por WhatsApp al número del ejecutivo. Debe verse bien en pantalla chica, pero no se construyen flujos móviles.
10. **Alcance cerrado.** Lo que no está en `docs/02-requisitos-funcionales.md` no se construye sin registrar la decisión y confirmar con Ignacio (son mejoras que se cotizan aparte).
11. **Todo lo que entra desde afuera es hostil.** Correos y mensajes de WhatsApp nunca se renderizan como HTML crudo (sanitizar o texto plano); la salida del clasificador se valida contra su esquema y solo clasifica; adjuntos con tipo y tamaño validados. Detalle en `docs/08-seguridad-roles.md`.
12. **Las tareas 🔒 del plan no se posponen.** Si una fase se cierra sin ellas, no está cerrada.

## 4. Convenciones de código

**Base Atomic CRM.** La arquitectura técnica de la base (ra-core + shadcn-admin-kit, data providers, vistas, FakeRest, estructura de `src/components/atomic-crm/`) está en `AGENTS.md`, que se importa abajo; `MEMORY.md` y `docs/learnings/` tienen aprendizajes de sus autores. Úsalos como referencia técnica. **Las reglas de negocio y de trabajo de este archivo mandan sobre ellos.** El sistema de agentes de Atomic (`#harness`) está desactivado (`.claude/_atomic-harness/README.md`): no lo uses.

- **Idioma:** identificadores, nombres de tablas/columnas y comentarios técnicos en inglés (como Atomic). Textos de interfaz en español de Chile, vía i18n (`src/lib/i18nProvider.ts`, agregar `es` como idioma por defecto). Documentación de `docs/` y commits en español.
- **Modelo de datos:** se **reutilizan las tablas de Atomic** (`contacts`, `companies`, `deals`, `sales`, `tasks`, `contact_notes`/`deal_notes`, `tags`) y se agregan las nuevas en inglés. El mapeo desde los nombres en español de `docs/05-modelo-datos.md` está al inicio de ese documento. Un lead de TekFusion es un `deal`; un ejecutivo es un `sale`.
- **Esquema declarativo:** la fuente de verdad son los archivos de `supabase/schemas/` (`01_tables.sql` … `08_search.sql`; agregar los nuestros como `10_tekfusion_*.sql`). Las migraciones de `supabase/migrations/` se **generan** con `npx supabase db diff --local -f <nombre>` y se revisan a mano; las funciones en `02_functions.sql` van en formato `pg_dump` (ver `AGENTS.md`). Nunca cambios manuales en remoto.
- **Estados:** un solo lugar. Las etapas del pipeline son configuración de Atomic (`<CRM dealStages>` en `src/App.tsx`): `nuevo`, `contactado`, `cotizado`, `ganado`, `perdido`, `archivado`. En código, constantes en `src/components/atomic-crm/tekfusion/estados.ts`. Nunca strings sueltos.
- **Código nuevo** en `src/components/atomic-crm/<modulo>/` siguiendo el patrón de Atomic (whatsapp, quotes, followups, alerts, business-lines, management-dashboard). Personalizar componentes existentes antes que duplicarlos. shadcn en `src/components/ui`.
- **Edge Functions** en `supabase/functions/<nombre>/` (Deno), reutilizando `_shared/`. Cada webhook valida `apikey`/firma y su entrada con zod.
- Flujos de n8n exportados como JSON en `n8n/flows/NN-nombre.json`, especificación en `docs/06-flujos-n8n.md`. El JSON del repo es la fuente de verdad.
- Fechas en UTC en base de datos; la interfaz muestra `America/Santiago`. Montos en CLP como enteros.
- Commits en español, imperativo, cortos: `agrega bandeja de WhatsApp`, `corrige RLS de deals`.
- Lo que Atomic trae y no usamos (`doc/` sitio Astro, `demo/`, Storybook, registro shadcn, Postmark) se limpia en la Fase 1 con plan aprobado, no a medias.

## 5. Flujo de trabajo con Claude Code

1. Antes de empezar una tarea, revisa la fase actual en `docs/09-plan-fases.md` y marca la tarea como en progreso.
2. Si una tarea requiere una decisión de diseño que no está documentada, propónla, regístrala en `docs/10-decisiones.md` y continúa. Si es irreversible (borrar datos, cambiar el stack, tocar producción), detente y pregunta.
3. Al terminar una tarea: tests o verificación manual descrita, actualizar `docs/09-plan-fases.md` y, si hubo decisiones, `docs/10-decisiones.md`.
4. Al cierre de cada sesión, ejecuta `/handoff` (ver `.claude/commands/handoff.md`) para dejar el resumen en `docs/handoffs/`.
5. Nunca ejecutes migraciones, despliegues ni envíos reales sin confirmación explícita de Ignacio en la conversación. Los hooks de `.claude/hooks/` bloquean `supabase db push`, `--project-ref …prod`, push a `main`, `rm -rf` peligrosos e impresión de `.env`; no intentes rodearlos.
6. Una rama por tarea (`fase-N/nombre`), PR chico con la plantilla de `.github/`, merge solo con CI en verde. En sesiones nocturnas (lanzadas por `scripts/tekfusion/nocturno.mjs`), haces **una sola tarea** por corrida y terminas con `HECHA:` o `BLOQUEADA:`; las reglas completas llegan en el system prompt. De día, `/nocturno <fase>` arma la cola y `/manana` revisa el resultado.
7. Para empezar desde cero, `docs/16-arranque.md` tiene el paso a paso. `docs/15-checklist-final.md` es lo que se revisa al cerrar cada fase.

## 6. Comandos habituales (Windows, desde la carpeta del repo)

```bash
# Frontend
npm install
npm run dev              # http://localhost:5173
npm run typecheck
npm run lint
npm run test:unit:app -- --run
npm run build

# Supabase local (Docker Desktop abierto)
npx supabase start
npx supabase status
npx supabase db reset --local           # aplica migraciones + seed en local (borra datos locales)
npx supabase db diff --local -f <nombre> # genera migración desde supabase/schemas/
npx supabase test db                    # tests pgTAP de supabase/tests/
npx supabase functions serve
# Remoto: `npx supabase db push` y `functions deploy` solo los ejecuta Ignacio (hook los bloquea).

# Demo sin base de datos (datos falsos en el navegador)
npm run dev:demo

# VPS (Docker Compose en /opt/tekfusion)
docker compose up -d     # evolution, n8n, uptime-kuma
docker compose logs -f evolution
```

`make` no existe en Windows: usa los scripts de npm de arriba. Los `make …` de `AGENTS.md` equivalen a ellos.

## 7. Ambientes

| Ambiente | Para qué | Datos | WhatsApp |
|---|---|---|---|
| local | desarrollo | seed ficticio | sin conexión o número de prueba |
| staging (`staging.crm.tekfusion.cl`) | QA, demos semanales, pruebas de los bots de Libux | ficticios | número de prueba de Libux |
| producción (`crm.tekfusion.cl`) | uso real | reales | número corporativo de TekFusion |

Staging y producción tienen proyectos de Supabase separados e instancias de Evolution separadas.

## 8. Skills, hooks y MCP

- Metodología única: **agent-skills** de Addy Osmani (`/spec`, `/plan`, `/build`, `/test`, `/agent-skills:review`, `/ship`).
- Skills de Atomic para este código (activas en `.claude/skills/`): `backend-dev`, `frontend-dev`, `shadcn-customization`, `update-branding`, `e2e-conventions`, `playwright-testing`, `delete-initial-resource`, `ponytail*` (auditorías de deuda técnica).
- Skills oficiales de **Supabase** y su MCP (solo staging). **n8n-mcp** (solo staging). **Context7**, **GitHub MCP**. Playwright MCP viene configurado en `.mcp.json`.
- Agentes revisores de **ECC** (`database-reviewer`, `security-reviewer`) antes de cerrar Fase 2 y Fase 7.
- Hooks activos (`.claude/settings.json`): guardia de comandos (nuestro + el de Atomic), chequeos antes de `git push`, formateo al escribir, aviso de atajos de TypeScript, recordatorio de `/handoff`.
- No instalar otra metodología (Superpowers u otras). Detalle e instalación en `docs/14-herramientas-claude-code.md`.

## 9. Lo que Claude Code NO hace en este proyecto

- No envía mensajes a clientes reales ni ejecuta flujos de n8n contra producción.
- No cambia la licencia de los componentes ni elimina avisos de copyright de terceros.
- No agrega dependencias pesadas sin justificar (preferir lo que ya trae Atomic CRM y shadcn).
- No construye funcionalidades fuera de alcance "porque sería fácil".

## 10. Referencia técnica de Atomic CRM

@AGENTS.md
