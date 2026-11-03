# 14 · Herramientas para Claude Code (skills, agentes, MCP)

> **Actualizado 2026-11-03 al crear el repo.** Atomic CRM trae su propio set de Claude Code. Quedan **activas** sus skills de código (`backend-dev`, `frontend-dev`, `shadcn-customization`, `update-branding`, `e2e-conventions`, `playwright-testing`, `ponytail*`), sus hooks útiles y Playwright MCP en `.mcp.json`; su orquestación de agentes está **desactivada** (`.claude/_atomic-harness/README.md`). Por eso ECC se reduce a 2 agentes, y Playwright MCP no se instala aparte. Ver `10-decisiones.md`.

Qué instalar, de quién, en qué orden y qué no mezclar. Todo lo listado es open source (MIT salvo donde se indica) y vigente a noviembre de 2026.

## Regla de oro
**Una sola metodología + skills específicas del stack + MCPs de las herramientas.** Instalar varios packs completos a la vez duplica disparadores, hace que las skills "peleen" y consume contexto en cada sesión. Instalar poco, bien elegido.

## El stack recomendado

| Capa | Herramienta | Autor | Para qué la usamos |
|---|---|---|---|
| **Metodología (una sola)** | **agent-skills** | Addy Osmani (Google) | Ciclo completo: `/spec` → `/plan` → `/build` → `/test` → `/agent-skills:review` → `/ship`. 24 skills: spec-driven-development, planning-and-task-breakdown, test-driven-development, frontend-ui-engineering, api-and-interface-design, browser-testing-with-devtools, security-and-hardening, code-review-and-quality, documentation-and-adrs, shipping-and-launch |
| **Base de datos** | **supabase/agent-skills** (oficial de Supabase) | Supabase | Skill `supabase` (checklist de seguridad: RLS, `security_invoker`, manejo de `service_role`; flujo de migraciones; consulta docs vigentes) + `supabase-postgres-best-practices` |
| **Base de datos (MCP)** | **Supabase MCP server** (oficial) | Supabase | Claude Code consulta docs y ejecuta SQL en **staging**. Nunca conectado a producción |
| **Automatizaciones (MCP)** | **n8n-mcp** | Romuald Czlonkowski | Claude Code busca nodos, valida y crea/edita flujos en la instancia de **staging** de n8n vía API |
| **Revisores especializados** | **Everything Claude Code (ECC)** — solo agentes sueltos | Affaan Mustafa (ganador hackathon Anthropic) | Se instala el plugin pero se usan solo: `database-reviewer` y `security-reviewer` (cierre de Fase 2 y Fase 7). Lo demás lo cubren las skills de Atomic. **No** activar sus rules completas ni su flujo de planificación (choca con agent-skills) |
| **Diseño** | skill `frontend-design` (Anthropic) + componentes shadcn/ui | Anthropic | Interfaz con identidad propia, no "look de IA" |
| **Pruebas de navegador** | Playwright MCP (ya configurado en `.mcp.json` de Atomic) + skill `playwright-testing` | Atomic / Microsoft | Verificar flujos del CRM en local/staging; tests en `e2e/` |
| **CI** | **claude-code-action** | Anthropic | Revisión automática de PRs en GitHub (opcional, desde la Fase 3) |

**Descartado a propósito:** `obra/superpowers`. Es excelente, pero es otra metodología completa (brainstorm → plan → TDD con subagentes). Elegir **una**: agent-skills por ser más liviana y por los comandos de ciclo de vida. Si en la práctica agent-skills no convence, se cambia por Superpowers, nunca ambas.

## Instalación (en este orden)

```bash
# 1. Metodología
claude plugin marketplace add addyosmani/agent-skills
claude plugin install agent-skills@addy-agent-skills

# 2. Supabase (skills oficiales)
claude plugin marketplace add supabase/agent-skills
claude plugin install supabase@supabase-agent-skills

# 3. Supabase MCP (solo proyecto de STAGING; token de acceso personal con alcance al proyecto)
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --project-ref <ref-staging> --read-only=false

# 4. n8n MCP (instancia de STAGING; API key creada en n8n → Settings → n8n API)
claude mcp add n8n-mcp -e MCP_MODE=stdio -e LOG_LEVEL=error -e DISABLE_CONSOLE_OUTPUT=true \
  -e N8N_API_URL=https://n8n.staging.tekfusion.cl -e N8N_API_KEY=<key> -- npx n8n-mcp

# 5. ECC (solo para sus agentes revisores)
claude plugin marketplace add https://github.com/affaan-m/ECC
claude plugin install ecc@ecc

# 6. LSP de TypeScript (lo usa la config de Atomic: navegación de código precisa)
npm install -g typescript-language-server typescript
claude plugin marketplace update claude-plugins-official
claude plugin install typescript-lsp@claude-plugins-official

# 7. Context7 (documentación vigente de librerías)
claude mcp add context7 -- npx -y @upstash/context7-mcp

# 8. GitHub MCP (token fine-grained, solo el repo tekfusion-crm)
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=<token> -- npx -y @modelcontextprotocol/server-github

# Playwright MCP: NO instalar, ya está en .mcp.json (Claude Code pide aprobarlo la primera vez).
```

Todo lo anterior lo hace `scripts/tekfusion/arranque.ps1` (pasos 1, 2, 5, 6 y 7). Supabase MCP, n8n-mcp y GitHub MCP se agregan a mano cuando existan staging y el token.

Después de instalar, en Claude Code: `/plugin` → desactivar en ECC todo salvo `database-reviewer` y `security-reviewer`. Verificar con `/mcp` que Supabase y n8n responden.

## Cómo se usa en cada fase

| Fase | Comandos / agentes |
|---|---|
| 1 Infra | `/plan` sobre `docs/09-plan-fases.md` Fase 1; `source-driven-development` para Docker/Caddy |
| 2 Datos y RLS | skill `supabase` + Supabase MCP (staging); `database-reviewer` y `security-reviewer` de ECC antes de dar por cerrada la RLS; `test-driven-development` para tests de políticas |
| 3 CRM | `/spec` por módulo (pipeline, ficha, cotizaciones, seguimientos); `frontend-ui-engineering` + skills `frontend-dev`, `shadcn-customization`, `update-branding` de Atomic; `ponytail-review` antes de cerrar |
| 4 WhatsApp | `api-and-interface-design` para el contrato del webhook; `security-and-hardening` (validación de `apikey`, idempotencia); `e2e-runner` con número de prueba |
| 5 n8n | n8n-mcp para construir y validar los 11 flujos en staging; exportar JSON al repo; `verification-loop` |
| 6 Dashboard | `supabase-postgres-best-practices` para vistas e índices; `performance-optimization` |
| 7 Entrega | `/agent-skills:review` global; `security-and-hardening`; `documentation-and-adrs` para `docs/`; `shipping-and-launch` (checklist, rollback) |

## MCP adicionales (pocos, con un propósito claro)

| MCP | Para qué | Nota |
|---|---|---|
| **GitHub MCP** (oficial, `github/github-mcp-server`) | Claude Code crea ramas, PRs e issues; lee el estado de CI | Token fine-grained con alcance solo al repo `tekfusion-crm` |
| **Playwright MCP** (oficial de Microsoft) | Pruebas end-to-end reales en el navegador contra local/staging: login, pipeline, ficha, bandeja | **Ya viene en `.mcp.json` de Atomic**; no instalar aparte. Tests en `e2e/` |
| **Context7** | Documentación actualizada de librerías (Supabase JS, shadcn, TanStack Query, Evolution API) para que no invente APIs | Gratis; evita código con versiones viejas |
| **Supabase MCP** y **n8n-mcp** | Ya listados arriba | Solo staging |

No instalar: MCP de Cloudflare (el deploy es automático desde Git), MCP de Evolution (no existe uno oficial; se usa su OpenAPI vía Context7/fetch), MCP de Notion (la conexión con Notion la hacen los bots de Libux, no Claude Code).

## Controles automáticos (para que lo limpio no dependa de la memoria)

**Hooks de Claude Code** (`.claude/settings.json`, ya configurados):
- `PreToolUse` Bash: `guard-bash.mjs` (nuestro: bloquea `supabase db push`, `functions deploy`, `--project-ref …prod`, push a `main`, push forzado, `reset --hard`, `rm -rf` peligrosos, imprimir `.env`); `bash-guard.mjs` (Atomic: Playwright sin `--headed`, Vite sin `--open`); `pre-pr-checks.mjs` (Atomic: typecheck y lint antes de `git push` / `gh pr create`).
- `PostToolUse` Write/Edit: `format-on-write.mjs` (prettier) y `check-typescript-shortcuts.mjs` (avisa `any`, `@ts-ignore`).
- `Stop`: `stop-reminder.mjs` recuerda `/handoff` si hay cambios sin commit.
- Permisos: no leer `.env*` reales; no fusionar PRs ni crear repos vía GitHub MCP; no `apply_migration` vía Supabase MCP.

**Pre-commit** (husky + lint-staged de Atomic, `.husky/pre-commit`): genera el registro shadcn, `eslint --fix` y `prettier` en lo staged, y **gitleaks** si está instalado (si no, avisa; el CI lo escanea igual).

**CI en GitHub Actions**, en cada PR:
1. `check.yml` (de Atomic): ESLint + Prettier, typecheck, tests unitarios (app y Edge Functions), e2e con Playwright, build.
2. `seguridad.yml` (nuestro): gitleaks, migraciones + **tests de RLS con pgTAP** (`supabase/tests/`, se crean en Fase 2), `npm audit` (bloqueante desde Fase 3).
Solo se mergea a `main` con CI en verde. `main` despliega solo a staging; producción se despliega a mano con tag. La revisión automática con `claude-code-action` queda para después (el workflow de Atomic está guardado en `docs/atomic/claude.yml`).

**Estructura de trabajo:** una rama por tarea del plan (`fase-2/rls-leads`), git worktrees cuando se trabajan varias en paralelo, PR chico, merge diario.

## Protocolo de sesiones nocturnas (trabajo sin supervisión)

Está implementado como un **loop por tareas** en `scripts/tekfusion/nocturno.mjs` (Windows y Mac). Explicación completa en `docs/nocturno/README.md`. En corto:

- **Una tarea por corrida de `claude -p`, con contexto limpio.** Nada de "haz toda la lista": si una tarea se traba, no arrastra a las demás.
- **El script verifica, no Claude.** Cada tarea trae un comando de verificación; si falla, el script deshace los cambios, reintenta una vez con el error a la vista, y si vuelve a fallar la marca `fallida` y pasa a la siguiente.
- **Claude puede declararse bloqueado** (`BLOQUEADA: motivo`) cuando falta una decisión o un dato; el script lo anota y sigue.
- **Todo queda commiteado en la rama `nocturno/<fecha>`** tarea por tarea, más un reporte para la mañana con el `claude --resume` de cada tarea fallida.
- **Frenos:** tope de turnos y dólares por tarea y por noche, hora de corte, y parada automática si Claude no logra arrancar 3 veces seguidas.
- **Permisos acotados:** editar, leer, npm/npx/supabase local, git de solo lectura. Sin commit, push, instalar dependencias, preguntas, web ni remotos. Los hooks del repo siguen activos.

Ciclo: de día `/nocturno <fase>` arma la cola (`docs/nocturno/<fecha>.json`) a partir de `docs/09`; de noche `NOCHE.cmd` (o `nocturno.sh`); en la mañana `/manana`.

Lo que sí se deja de noche: tareas con criterio en tests o comandos, scaffolding, seed, tipos, traducciones, tests de código ya hecho, documentación. Lo que no: integraciones externas (Evolution, VíaRed, Gmail), decisiones de diseño, staging/producción, tareas 🔒 que requieren revisión humana.

## Reglas de seguridad para las herramientas
1. **Supabase MCP y n8n-mcp apuntan solo a staging.** Producción se opera a mano (migraciones con `supabase db push` tras confirmación; flujos importados desde el JSON del repo).
2. Las API keys de los MCP van en la configuración local de Claude Code (`~/.claude.json` o `.mcp.json` ignorado por git), nunca en el repo.
3. Revisar el código de cualquier plugin antes de instalarlo (hooks de sesión = código que corre en tu máquina). Fijar versiones.
4. Si un plugin genera ruido o duplica disparadores, se desinstala; no se "ajusta encima".
5. Los agentes revisores opinan; la decisión y el merge los hace Ignacio.

## Fuentes
- Addy Osmani, agent-skills: https://github.com/addyosmani/agent-skills
- Everything Claude Code (Affaan Mustafa): https://github.com/affaan-m/everything-claude-code
- Supabase Agent Skills (oficial): https://supabase.com/blog/supabase-agent-skills
- n8n-mcp: https://github.com/czlonkowski/n8n-mcp
- Superpowers (obra), descartado como segunda metodología: https://github.com/obra/superpowers
- Directorios para buscar más: https://github.com/hesreallyhim/awesome-claude-code · https://github.com/anthropics/skills
