# Sesiones nocturnas: cómo funciona el loop

Claude Code trabaja solo mientras duermes, **una tarea a la vez, con contexto limpio en cada una**. El script `scripts/tekfusion/nocturno.mjs` es el capataz: reparte las tareas, verifica cada una por su cuenta, guarda lo que pasó y anota lo que falló. En la mañana abres el reporte y retomas desde ahí.

## El ciclo (por cada tarea de la cola)
1. El script crea (o retoma) un worktree aparte: `../tekfusion-crm-noche-<fecha>`, rama `nocturno/<fecha>`. El repo principal no se toca.
2. Lanza `claude -p` con **solo esa tarea** en el prompt, las reglas de `scripts/tekfusion/nocturno-sistema.md`, permisos acotados (editar archivos, correr npm/npx/supabase local, leer git; **no** commit, push, instalar dependencias, preguntar, ni tocar remotos), tope de turnos y de dólares.
3. Al terminar Claude, **el script corre la verificación de la tarea** (el comando `verificacion`). No se confía en que Claude diga "listo".
4. Si pasa: `git commit` con el id de la tarea. Si no pasa: guarda el error, **deshace todos los cambios** (`git reset --hard` + `git clean`) y reintenta una vez más mostrándole el error. Si vuelve a fallar: queda `fallida` y sigue con la siguiente.
5. Si Claude termina con `BLOQUEADA: <motivo>` (necesita una decisión o un dato): deshace, anota el motivo, sigue.
6. Si una tarea `depende_de` otra que no quedó `hecha`: se marca `omitida`. Si `necesita_supabase` y Supabase local no responde: `omitida`.
7. Después de cada tarea escribe `docs/nocturno/<fecha>.json` (la cola con estados), `docs/nocturno/<fecha>-reporte.md` y commitea ambos en la rama. Si el PC se apaga a las 4 AM, lo hecho hasta las 3:59 está guardado.
8. Se detiene cuando: termina la cola · llega `hora_fin` · se gasta `usd_total` · 3 veces seguidas Claude no logra ni arrancar (sesión caducada, sin cuota, sin red).

Cada corrida de `claude -p` guarda su sesión: en el reporte, cada tarea fallida tiene un `claude --resume <session_id>` para retomarla en la mañana con todo el contexto que Claude tenía.

## Archivos
| Archivo | Qué es |
|---|---|
| `docs/nocturno/<fecha>.json` | La cola. La escribe `/nocturno` (o tú, desde `PLANTILLA.json`). El script la actualiza. |
| `docs/nocturno/<fecha>-reporte.md` | Reporte para la mañana. Vive en la rama `nocturno/<fecha>`. |
| `docs/nocturno/ULTIMO-reporte.md` | Copia del último reporte en el repo principal (ignorada por git) para que `/manana` la lea sin cambiar de rama. |
| `docs/nocturno/<fecha>.log` | Log del script (ignorado por git). |
| `docs/nocturno/aprendizajes.md` | Una línea por cosa útil que Claude descubrió (se conserva aunque la tarea falle). Las líneas `PENDIENTE:` son problemas vistos fuera de la tarea. |
| `scripts/tekfusion/nocturno-sistema.md` | Reglas que Claude recibe en cada corrida. |

## Cómo se usa
**De día (10 min):** en Claude Code, `/nocturno 2` (fase 2) → revisa la cola propuesta → confirma → queda `docs/nocturno/<mañana>.json`. Commitea.

**Antes de dormir:** repo sin cambios pendientes, Docker Desktop abierto si alguna tarea lo necesita, y:
- Windows: doble clic en `NOCHE.cmd` (usa la fecha de hoy) o `node scripts\tekfusion\nocturno.mjs --fecha 2026-11-04`
- Mac: `scripts/tekfusion/nocturno.sh --fecha 2026-11-04`

Opciones: `--hasta 06:30` (hora de corte), `--modelo opus --esfuerzo high` (también van en el JSON: `"modelo"`, `"esfuerzo"`), `--max-tareas 3`, `--solo T4` (una sola tarea), `--simular` (recorre la cola sin llamar a Claude, para probar), `--sin-dormir` (no bloquea la suspensión).

**En la mañana:** en Claude Code, en el repo principal, `/manana` → resumen, qué mergear, qué arreglar y en qué orden, y el `--resume` de cada tarea fallida. La rama nocturna entra a `main` solo por PR (ruleset): `git push -u origin nocturno/<fecha>` → `gh pr create` con el resumen → `gh pr checks --watch` → `gh pr merge --squash --delete-branch` cuando Ignacio lo pide.

## Qué va en la cola y qué no
**Sí:** tareas con criterio en tests o comandos (typecheck, vitest, pgTAP, `db reset`, build); scaffolding de pantallas y formularios a partir de una spec; seed; tipos; traducciones; tests para código ya hecho; documentación.

**No:** integraciones con servicios externos (Evolution, VíaRed, Gmail, Cloudflare); decisiones de diseño; staging o producción; tareas 🔒 de seguridad que requieren revisión humana; nada que dependa de accesos que no están.

Regla de oro: **si no puedes escribir el comando que demuestra que quedó bien, no va de noche.**

## Límites por defecto (`limites` en el JSON)
`turnos_por_tarea` 60 · `usd_por_tarea` 4 · `usd_total` 20 · `hora_fin` 07:00 · `intentos` 2 · `minutos_verificacion` 15 · `modelo_reintento` fable · `esfuerzo_reintento` high.

**Modelos:** el primer intento usa el modelo de la cola (`opus` / `high`); si la verificación falla, el reintento sube a `modelo_reintento` (Fable, alto). Una tarea puede fijar el de su **primer intento** con `"modelo"` y `"esfuerzo"` propios; el reintento usa siempre `modelo_reintento` / `esfuerzo_reintento` de la cola si están (desde el 2026-11-10). El reporte muestra qué modelo se usó en cada una. Con plan Max el costo en dólares es estimado (no se cobra aparte), pero sirve de freno: una tarea que gasta US$4 está dando vueltas. Lo que sí consume la noche es la **cuota del plan** (ventana de 5 h y límite semanal): con Max 5x, 5–6 tareas con Opus por noche es razonable; más que eso te deja corto para el día siguiente. Usa `--max-tareas`.

## Qué puede salir mal y qué pasa
| Situación | Qué hace el script |
|---|---|
| El PC se suspende | Lo intenta evitar (Windows: `SetThreadExecutionState`; Mac: `caffeinate`). Igual desactiva la suspensión en el sistema. |
| Claude pide permiso para algo no permitido | Se le niega y se le dice que no insista (`--permission-prompts none`). |
| Claude se queda dando vueltas | Tope de turnos y de dólares por tarea → `fallida` con el error. |
| La verificación se cuelga | Tope de `minutos_verificacion` → `fallida`. |
| Sesión de Claude Code caducada / sin cuota | 3 fallos seguidos → se detiene y lo dice en el reporte. |
| Un hook bloquea un comando | Es a propósito; la tarea sigue o queda bloqueada. |
| Se corta la luz | Todo lo anterior está commiteado en la rama. Relanzar el mismo comando retoma lo pendiente. |
