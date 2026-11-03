# CRM TekFusion

Sistema comercial a medida para TekFusion, desarrollado por Libux. Propiedad de TekFusion.

## Cómo empezar
1. Doble clic en **`ARRANQUE.cmd`** (revisa e instala lo que falte, `npm install`, herramientas de Claude Code, Supabase local).
2. `npm run dev` → http://localhost:5173.
3. `claude` → pega el prompt inicial de abajo.

Paso a paso completo, con qué hacer si algo falla: **`docs/16-arranque.md`**.

Base: [Atomic CRM](https://github.com/marmelab/atomic-crm) (MIT, ver `LICENSE.md`), commit `251d3cc` del 2 de noviembre de 2026. Su documentación original está en `docs/atomic/README-atomic.md` y su referencia técnica en `AGENTS.md`.

## Documentación
| Archivo | Contenido |
|---|---|
| `CLAUDE.md` | Reglas y convenciones para Claude Code |
| `docs/01-contexto-negocio.md` | Quién es TekFusion, cómo trabaja hoy, el dolor |
| `docs/02-requisitos-funcionales.md` | Alcance cerrado del desarrollo |
| `docs/03-reglas-negocio.md` | Estados, asignación, seguimientos, alertas, anti-bloqueo |
| `docs/04-arquitectura.md` | Stack, principios, componentes, infraestructura |
| `docs/05-modelo-datos.md` | Tablas, enums, vistas, funciones, seed |
| `docs/06-flujos-n8n.md` | Especificación de los 11 flujos |
| `docs/07-whatsapp-evolution.md` | Receptor, envío, bandeja, reconexión, plan B |
| `docs/08-seguridad-roles.md` | Auth, RLS, secretos, datos de clientes |
| `docs/09-plan-fases.md` | Plan de 7 fases con checklist y demos semanales |
| `docs/10-decisiones.md` | Registro de decisiones (ADR) |
| `docs/11-pendientes-kickoff.md` | Datos que faltan de TekFusion |
| `docs/12-equipo-agentes.md` | Rol de los bots de Libux (Grok Bot) y Notion |
| `docs/13-acuerdo-comercial.md` | Qué se contrató, qué no, checklist de traspaso |
| `docs/14-herramientas-claude-code.md` | Skills, MCP, hooks, CI, protocolo nocturno |
| `docs/15-checklist-final.md` | Lo que rodea al código: actas, migración, corte, entrega, modelo por tarea |
| `docs/16-arranque.md` | Paso a paso para empezar hoy |
| `docs/nocturno/` | Loop nocturno: README, plantilla de cola, reportes |
| `n8n/prompts/clasificar-lead.md` | Prompt de clasificación de leads |
| `.claude/commands/` | `/estado`, `/fase N`, `/handoff`, `/nocturno N`, `/manana` |
| `.claude/hooks/` + `settings.json` | Guardia de comandos peligrosos, chequeos antes de push, formateo, recordatorio de handoff |
| `.github/workflows/` | `check.yml` (Atomic: lint, typecheck, unit, e2e, build) + `seguridad.yml` (gitleaks, pgTAP, audit) |
| `.husky/pre-commit` | lint-staged + gitleaks |
| `scripts/tekfusion/` | `arranque.ps1`/`.sh`, `nocturno.mjs` (loop nocturno), `nocturno-sistema.md` |

## Prompt inicial sugerido para Claude Code
> Lee CLAUDE.md completo, docs/09-plan-fases.md y docs/10-decisiones.md (las entradas del 2026-11-03). Estamos en la Fase 1, sin accesos de TekFusion todavía. Primero /estado. Después, con /plan, propón el plan para hoy en local: (1) que `npm run typecheck`, `npm run lint`, `npm run test:unit:app -- --run` y `npm run build` pasen en Windows; (2) agregar español como idioma por defecto en `src/lib/i18nProvider.ts`; (3) cambiar las etapas del pipeline a las nuestras (`docs/03`); (4) dejar la navegación base en español y la página Créditos; (5) listar lo que Atomic trae y no usamos, sin borrarlo todavía. No instales dependencias sin decirme. Muéstrame el plan y espera mi confirmación.
