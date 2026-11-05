# 16 · Arranque: paso a paso

**Estado al 3 de noviembre de 2026:** el repo ya existe en `D:\Tekfusion\tekfusion-crm`, armado sobre Atomic CRM con todo el kit fusionado y un primer commit. Falta instalar en tu computador lo que no se puede instalar desde afuera, levantarlo y abrir la primera sesión de Claude Code.

Tiempo: 30–60 minutos la primera vez (la mayor parte es esperar descargas). Marca cada paso.

## Paso 1 · Preparar el computador (un doble clic)
- [ ] Abre `D:\Tekfusion\tekfusion-crm` en el Explorador y haz doble clic en **`ARRANQUE.cmd`**.
- [ ] El script revisa Node 24, Git, GitHub CLI, gitleaks, Docker Desktop y Claude Code. Lo que falte, te pregunta si lo instala (responde `s`).
- [ ] **Si instaló Docker Desktop:** reinicia el PC, abre Docker Desktop (acepta WSL2 si lo pide), espera que diga "Engine running" y vuelve a hacer doble clic en `ARRANQUE.cmd`.
- [ ] **Si instaló Node:** cierra la ventana y vuelve a abrir `ARRANQUE.cmd` (para que tome el PATH nuevo).
- [ ] El script corre `npm install`, instala las skills y MCP de Claude Code (te pregunta) y levanta Supabase local (te pregunta; la primera vez descarga ~1 GB).

Si algo sale en rojo, copia el texto y pégalo en Claude.

## Paso 2 · Ver Atomic funcionando (5 min)
Abre una terminal en la carpeta del repo (en el Explorador: clic derecho → "Abrir en Terminal"):
```powershell
npm run dev
```
- [ ] Abre http://localhost:5173 → entra con un usuario del seed ficticio (`andrea.soto@tekfusion-demo.cl`, administradora; o `camila.rojas@tekfusion-demo.cl`, ejecutiva; clave `demo-tekfusion`). Si ves el CRM en español con leads de válvulas, tuberías y geoceldas, está sano.
- [ ] Supabase Studio local (la base de datos por dentro): http://127.0.0.1:54323

No hace falta copiar claves del frontend: `.env.development` (de Atomic) ya apunta al Supabase local. Para las Edge Functions en local, copia `supabase/functions/.env.example` a `supabase/functions/.env` y completa `SB_PUBLISHABLE_KEY` con el valor "Publishable" de `npx supabase status`.

Si solo quieres mirar sin base de datos: `npm run dev:demo` (datos falsos en el navegador).

## Paso 3 · Subir a GitHub (5 min)
Por ahora en tu cuenta; se transfiere a TekFusion en la Fase 1 (`10-decisiones.md`).
```powershell
gh auth login
gh repo create tekfusion-crm --private --source=. --push
```
- [ ] En GitHub → pestaña **Actions**: deben correr **✅ Check** y **Seguridad**. La primera vez puede fallar el e2e de Atomic o el audit; eso es la primera tarea de Claude Code, no un drama.
- [ ] GitHub → Settings → Branches → protege `main` (requerir PR y checks en verde). Settings → Code security → activa *Secret scanning* y *Push protection*.

## Paso 4 · Primera sesión de Claude Code (30–45 min)
En otra terminal, en la carpeta del repo:
```powershell
claude
```
La primera vez te pregunta si confías en la carpeta (sí) y si aprueba el MCP de Playwright de `.mcp.json` (sí). Luego `/plugin` → en ECC deja activos solo `database-reviewer` y `security-reviewer`.

Pega este primer mensaje:
> Lee CLAUDE.md completo, docs/09-plan-fases.md y docs/10-decisiones.md (las entradas del 2026-11-03). Estamos en la Fase 1, sin accesos de TekFusion todavía. Primero /estado. Después, con /plan, propón el plan para hoy en local: (1) que `npm run typecheck`, `npm run lint`, `npm run test:unit:app -- --run` y `npm run build` pasen en Windows; (2) agregar español como idioma por defecto en `src/lib/i18nProvider.ts`; (3) cambiar las etapas del pipeline a las nuestras (`docs/03`); (4) dejar la navegación base en español y la página Créditos; (5) listar lo que Atomic trae y no usamos, sin borrarlo todavía. No instales dependencias sin decirme. Muéstrame el plan y espera mi confirmación.

- [ ] Revisa el plan, ajústalo, confirma. Que construya en una rama (`fase-1/base-es`).
- [ ] Al terminar: `git push -u origin fase-1/base-es` → PR → CI en verde → merge.
- [ ] Cierra con `/handoff`.

## Paso 5 · Primera noche (10 min)
Cómo funciona el loop: `docs/nocturno/README.md`. Para la primera:
1. En Claude Code: `/nocturno 1 2026-11-04` (fase 1, fecha de la noche). Te propone una cola de tareas cerradas y verificables; buenas candidatas para empezar: constantes de etapas + test, seed ficticio, traducciones de textos de Atomic. Confírmala → queda `docs/nocturno/2026-11-04.json`. Commitea.
2. Antes de dormir: repo sin cambios pendientes (`git status`), Docker Desktop abierto, suspensión desactivada.
3. Windows: doble clic en **`NOCHE.cmd`** (si la fecha de la cola es hoy) o en una terminal `node scripts\tekfusion\nocturno.mjs --fecha 2026-11-04`. Mac: `scripts/tekfusion/nocturno.sh --fecha 2026-11-04`.
4. Deja la ventana abierta. Trabaja en `D:\Tekfusion\tekfusion-crm-noche-2026-11-04` (rama `nocturno/2026-11-04`); el repo principal no se toca.

Para probar el mecanismo sin gastar nada: `node scripts\tekfusion\nocturno.mjs --fecha 2026-11-04 --simular`.

## Paso 6 · A la mañana siguiente (15 min)
1. En Claude Code, en el repo principal: `/manana`. Lee el reporte y te dice: qué quedó hecho (y si algo merece revisión extra), qué falló y por qué, en qué orden atacarlo, y el `claude --resume <id>` para retomar cada tarea fallida con su contexto.
2. Lo hecho: `git push -u origin nocturno/2026-11-04` → PR → CI → merge.
3. Lo fallido: lo arreglas de día (tú con Claude Code), o lo vuelves a encolar para la noche siguiente con mejor definición.
4. Borrar el worktree cuando ya esté mergeado: `git worktree remove ../tekfusion-crm-noche-2026-11-04 --force` (en Windows, antes: `cmd /c rmdir ..\tekfusion-crm-noche-2026-11-04\node_modules`, que solo quita el enlace).
5. `claude` → `/estado` → sigue la Fase 1 real: cuentas, VPS, staging (`docs/09`).

## Qué hay en el repo (para no perderse)
| Dónde | Qué |
|---|---|
| `CLAUDE.md` | Reglas del proyecto (mandan sobre todo lo demás) |
| `AGENTS.md`, `MEMORY.md`, `docs/learnings/` | Referencia técnica de Atomic (de sus autores) |
| `docs/01`–`16` | Todo lo nuestro: negocio, alcance, arquitectura, plan, seguridad |
| `docs/atomic/` | Archivos de Atomic que reemplazamos (README, workflows) |
| `.claude/` | Comandos `/estado` `/fase` `/handoff`, hooks, skills de Atomic |
| `.claude/_atomic-harness/` | Sistema de agentes de Atomic, desactivado (ver su README) |
| `supabase/schemas/` | Esquema de la base (fuente de verdad) |
| `scripts/tekfusion/` | `arranque.ps1` / `arranque.sh`, `nocturno.mjs` (loop), `nocturno-sistema.md` (reglas de noche) |
| `docs/nocturno/` | Colas, reportes y README del loop nocturno |
| `ARRANQUE.cmd` / `NOCHE.cmd` | Doble clic: preparar el PC / lanzar la noche |

## Tests e2e (Playwright) contra el stack local
1. Docker Desktop abierto y Supabase local arriba (`npx supabase start`).
2. `npm run test:e2e`. El script (`scripts/tekfusion/e2e.mjs`) **resetea la base local** (`npx supabase db reset --local`, borra lo que hayas cargado), levanta Vite en el puerto **5180** con `.env.development`, corre `npx playwright test --config playwright.tekfusion.config.ts` y apaga Vite al final, pasen o no los tests. Sale con el código de Playwright.
3. El puerto 5180 debe estar libre (`--strictPort`: si está ocupado, falla en vez de usar otro).
4. Los tests están en `e2e/tekfusion/` y entran como Camila (ejecutiva del seed). Si falla uno, el detalle queda en `test-results/` (`npx playwright show-trace <ruta>/trace.zip`).

El harness e2e de Atomic (`playwright.config.ts`, `e2e/*.spec.ts`, `.env.e2e`) no se usa.

## Si algo falla en Windows
- **Un hook de Claude Code da error** (mensajes con `.claude/hooks/...`): copia el error y pégalo en Claude. Plan B: abrir el repo en el `.devcontainer/` de Atomic (VS Code → "Reopen in Container") o en WSL2.
- **`npx supabase start` falla:** Docker Desktop cerrado o sin WSL2. Ábrelo, espera "Engine running".
- **`npm install` falla con node-gyp o permisos:** confirma Node 24 (`node -v`), cierra VS Code y vuelve a intentar.
- **Git dice "dubious ownership":** `git config --global --add safe.directory D:/Tekfusion/tekfusion-crm` (el script ya lo hace).

## Al crear un proyecto de Supabase en la nube (staging y producción)
Lo que no existe en local y se hace en el panel de Supabase, una vez por proyecto:
- [ ] Authentication → Policies: activar **"Leaked password protection"** (HaveIBeenPwned). La política de largo y requisitos viaja en `config.toml` con `npx supabase config push`.
- [ ] Authentication → Multi-factor: confirmar TOTP habilitado (viaja en `config.toml`).
- [ ] Advisors → **Security Advisor**: cero avisos de nivel error antes de cerrar la fase (`docs/09`).
- [ ] Authentication → Sign in: desactivar el registro abierto (`enable_signup`) en producción (decisión pendiente en `docs/10`).

### Variables de la nube: Sentry (errores)
Sentry queda apagado mientras su DSN esté vacío (así está en local y en el repo). Para activarlo, un proyecto de Sentry de la cuenta de TekFusion por ambiente:
- [ ] **`VITE_SENTRY_DSN`** (frontend): en Cloudflare Pages → Settings → Environment variables, una por ambiente (staging/producción). Se lee al compilar: hay que volver a desplegar. El `environment` lo pone el modo de Vite.
- [ ] **`SENTRY_DSN`** (Edge Functions): `npx supabase secrets set SENTRY_DSN=… SENTRY_ENVIRONMENT=staging` (lo ejecuta Ignacio). Sin él, `_shared/sentry.ts` ni siquiera carga `@sentry/deno`. Hoy lo usan `users` y `delete_note_attachments`.
- No se envían cookies, headers, cuerpos, correo ni IP (regla 5 de `CLAUDE.md`); el muestreo de trazas está en 0.

## Lo que NO hacer todavía
- No conectar un número de WhatsApp real ni el Gmail de marketing.
- No crear nada en producción ni proyectos de Supabase con datos reales.
- No pegar datos de TekFusion en ningún chat.
- No activar el `#harness` de Atomic ni instalar Superpowers u otro pack "para probar".
