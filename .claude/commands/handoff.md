Cierra la sesión de trabajo dejando un traspaso escrito.

1. Crea el archivo `docs/handoffs/AAAA-MM-DD.md` (fecha de hoy; si ya existe, agrega una sección con la hora) con estas secciones, en español y en viñetas cortas:
   - **Resumen**: qué se hizo en esta sesión.
   - **Decisiones**: cada decisión tomada, con motivo (y verifica que esté también en `docs/10-decisiones.md`; si no, agrégala allí).
   - **Trabajo sin terminar**: qué quedó a medias y en qué archivo.
   - **Trampas / gotchas**: cosas que costaron y conviene recordar.
   - **Próximos pasos**: las 3–5 tareas siguientes, en orden.
2. Actualiza `docs/09-plan-fases.md`: marca `[x]` lo terminado con la fecha y deja en progreso lo pendiente.
3. Si cambió el modelo de datos, un flujo de n8n o una regla de negocio, actualiza el doc correspondiente (`05`, `06` o `03`).
4. Confirma que no hay secretos en el diff (`git diff --cached | grep -iE "key|secret|password|token"`), haz commit con un mensaje corto en español y muestra el resumen final en pantalla.
