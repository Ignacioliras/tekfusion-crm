Prepara la cola de tareas para una sesión nocturna automática. Argumentos: `$ARGUMENTS` = fase (número) y opcionalmente la fecha (AAAA-MM-DD; por defecto mañana).

El loop nocturno (`scripts/tekfusion/nocturno.mjs`) corre **una tarea por vez con contexto limpio**, verifica cada una con su comando, commitea si pasa y anota el error si falla. Por eso cada tarea tiene que ser **cerrada, chica y verificable por un comando**. Lee `docs/nocturno/README.md` si no lo conoces.

Pasos:
1. Lee `docs/09-plan-fases.md` y toma las tareas pendientes de la fase indicada. Lee `docs/nocturno/PLANTILLA.json` para el formato.
2. Filtra: **sí** entran tareas con criterio de aceptación en tests o comandos (typecheck, vitest, pgTAP, `db reset`, build), scaffolding, seed, tipos, traducciones, tests para código ya hecho, documentación. **No** entran: integraciones con servicios externos (Evolution, VíaRed, Gmail, Cloudflare), nada que requiera elegir entre dos diseños, nada que toque staging o producción, tareas 🔒 de seguridad que necesiten revisión humana, tareas que dependan de accesos que no están (`docs/11`).
3. Divide lo grande en tareas de 20–60 minutos de trabajo cada una. Máximo 8 tareas por noche. Ordena de menor a mayor riesgo. Usa `depende_de` cuando una necesita otra.
4. Para cada tarea escribe: `id`, `titulo`, `descripcion` (concreta: qué archivo, qué exporta, qué comportamiento), `archivos` (lista cerrada), `verificacion` (un solo comando que en Windows corre en `cmd`; usa `&&`), `criterio`, `necesita_supabase`.
5. Muéstrame la cola completa en una tabla (id, título, verificación, minutos estimados) y **espera mi confirmación**. Si pido cambios, ajusta.
6. Con mi OK, escribe `docs/nocturno/<fecha>.json` con todos los campos de la plantilla (estado `pendiente`, intentos 0, etc.), y dime el comando para lanzarla: `node scripts/tekfusion/nocturno.mjs --fecha <fecha>` (o doble clic en `NOCHE.cmd` si la fecha es hoy).
7. Recuérdame: Docker Desktop abierto si alguna tarea tiene `necesita_supabase`, repo sin cambios sin commit, y PC sin suspensión (el script lo intenta, pero conviene).
