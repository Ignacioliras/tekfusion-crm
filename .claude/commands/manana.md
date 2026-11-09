Revisión de la mañana después de una sesión nocturna. Argumento opcional: `$ARGUMENTS` = fecha (AAAA-MM-DD); si falta, usa el reporte más reciente en `docs/nocturno/`.

1. Lee `docs/nocturno/ULTIMO-reporte.md` (copia del reporte; el original y la cola están en la rama `nocturno/<fecha>`: `git show nocturno/<fecha>:docs/nocturno/<fecha>.json`). Si existe `git show nocturno/<fecha>:docs/nocturno/aprendizajes.md`, léelo también.
2. Resume en máximo 10 líneas: cuántas hechas / fallidas / bloqueadas / omitidas, costo, hora de cierre y motivo de fin.
3. Para lo **hecho**: lista los commits de la rama `nocturno/<fecha>` (`git log main..nocturno/<fecha> --oneline`) y di si alguno merece revisión humana extra (tocó RLS, migraciones, auth, Edge Functions). Propón el merge o qué revisar antes. `main` tiene ruleset: **nunca** `git merge` local a `main` (ni `--ff-only`); el camino es siempre por PR:
   1. `git push -u origin nocturno/<fecha>`
   2. `gh pr create --base main --head nocturno/<fecha> --title "nocturno <fecha>: <resumen>" --body "<resumen de este reporte + plantilla de .github/>"`
   3. `gh pr checks --watch`
   4. `gh pr merge --squash --delete-branch` **solo si Ignacio lo pide** en la conversación. Con checks en rojo no se mergea: se reporta.
4. Para lo **fallido/bloqueado**: por cada tarea, en 2–3 líneas, qué falló (según el error del reporte) y la causa más probable. Clasifica: (a) error de código que se arregla en 10 min, (b) la tarea estaba mal definida, (c) falta una decisión o un dato de TekFusion, (d) problema de entorno (Docker, cuota, red).
5. Propón el orden para atacarlas hoy, empezando por las (a). Para cada una, el comando para retomarla con contexto: `cd <worktree>` y `claude --resume <session_id>`.
6. Si hubo `PENDIENTE:` en aprendizajes.md, lístalos como posibles issues.
7. Actualiza `docs/09-plan-fases.md`: marca `[x]` lo que quedó hecho y mergeado (solo si te confirmo el merge). Si hubo una decisión implícita en lo que hizo Claude de noche, anótala en `docs/10-decisiones.md` y dímelo.
8. Termina preguntándome por cuál empezamos.
