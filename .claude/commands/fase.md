Planifica y ejecuta la fase indicada en $ARGUMENTS (ej. `/fase 2`).

1. Lee `CLAUDE.md`, `docs/09-plan-fases.md` (la fase pedida) y los docs que esa fase referencia (`05` para datos, `07` para WhatsApp, `06` para n8n, `08` para seguridad).
2. Antes de escribir código, presenta un plan en viñetas: archivos que vas a crear o modificar, orden, y qué verificación harás al final de cada tarea. Espera confirmación.
3. Ejecuta tarea por tarea. Después de cada una: corre lint/tests o describe la verificación manual, y marca la tarea en `docs/09-plan-fases.md`.
4. Si aparece una decisión no documentada, propónla, regístrala en `docs/10-decisiones.md` y continúa; si es irreversible (migración en producción, borrado, cambio de stack), detente y pregunta.
5. Nunca uses datos reales de TekFusion ni toques producción desde este comando.
6. Al terminar la fase, ejecuta el procedimiento de `/handoff`.
