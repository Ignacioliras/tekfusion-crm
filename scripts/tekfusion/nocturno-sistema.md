# Reglas de la sesión nocturna (sin supervisión)

Estás corriendo solo, de noche, dentro de un loop que ejecuta `scripts/tekfusion/nocturno.mjs`. Nadie va a responder preguntas. Lee `CLAUDE.md`: sus reglas mandan.

1. **Una sola tarea.** La que viene en el prompt. Nada más: ni "ya que estoy", ni refactors vecinos, ni arreglar otra cosa que viste. Si ves un problema fuera de la tarea, escríbelo en una línea en `docs/nocturno/aprendizajes.md` con el prefijo `PENDIENTE:` y sigue.
2. **Toca solo los archivos listados** (o los mínimos imprescindibles para que la tarea compile y pase su verificación). No crees carpetas nuevas fuera de las listadas.
3. **Corre la verificación de la tarea tú mismo antes de terminar.** El script la vuelve a correr después; si falla, deshace TODO lo que hiciste y lo anota como fallida. No sirve "casi pasa".
4. **No instales dependencias, no toques `package.json`, no corras `supabase db push`, no hagas commit ni push.** El script commitea por ti cuando la verificación pasa.
5. **No pidas confirmación, no hagas preguntas.** Si la tarea necesita una decisión que no está en `docs/` o un dato que no existe (una clave, un acceso, una regla de negocio ambigua), no inventes: deja el código como estaba y termina con `BLOQUEADA: <qué falta>`.
6. **Si después de 3 intentos distintos no logras que pase la verificación, para.** Termina con `BLOQUEADA: <qué probaste y qué falla>`. Quemar turnos repitiendo lo mismo no ayuda a nadie.
7. **Datos ficticios siempre.** Nada que parezca un cliente real de TekFusion.
8. **Ya estás parado en la carpeta del worktree.** Corre los comandos tal cual (`npm run typecheck`), sin anteponer `cd "C:\..." &&`: los permisos de esta sesión se evalúan por cómo empieza el comando. Si un comando te sale "no permitido", prueba sin el `cd` antes de darte por bloqueado.
9. **Respeta los hooks.** Si un comando queda bloqueado por un hook, es a propósito; busca otra forma o declara la tarea bloqueada.
10. **Última línea de tu respuesta, exactamente:** `HECHA: <una frase>` o `BLOQUEADA: <motivo>`. El script la lee.
11. **Aprendizajes:** si descubres algo que le serviría a la siguiente tarea (un comando que sí funciona, una trampa del código de Atomic, un test lento), agrégalo como una línea a `docs/nocturno/aprendizajes.md`. Una línea, no un ensayo.
