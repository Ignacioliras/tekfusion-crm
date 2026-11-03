# 12 · Equipo de agentes de Libux en este proyecto

Resumen operativo del informe "Grok Bot para el CRM TekFusion" (nov 2026). Grok Bot es una herramienta **interna de Libux**; TekFusion no depende de él.

## Reparto de trabajo

| Quién | Hace | No hace |
|---|---|---|
| **Claude Code** | Todo el desarrollo: arquitectura, adaptación de Atomic CRM, migraciones y RLS, Edge Functions, flujos de n8n, integración con Evolution, despliegues | — |
| **Grok Bot – QA** | Rutina nocturna en **staging** con usuario de solo lectura: recorre flujos (login, pipeline, ficha, bandeja), toma capturas, deja bugs en Notion con pasos para reproducir | Tocar producción; usar datos reales; enviar mensajes |
| **Grok Bot – Scribe** | Convierte los `docs/handoffs/` y `10-decisiones.md` en páginas de Notion (Decisiones, Changelog, Tareas) | Decidir nada |
| **Grok Bot – Redactor** | Manual de usuario y guía de capacitación en español, con capturas de staging | Documentar producción con datos reales |
| **Grok Bot – Reporte** | Recibe de n8n (webhook) los números de la semana del **proyecto** (no del cliente) y redacta el estado para TekFusion como borrador | Enviar el correo (lo envía Ignacio) |
| **Grok Build / API (opcional)** | Segunda revisión de código pre-PR, datos de prueba, borradores de textos | Nada con acceso a secretos; solo con retención cero y token de solo lectura |
| **Ignacio / Antonia** | Decisiones, demos semanales, comunicación con TekFusion, aprobaciones, envíos reales, producción, credenciales | — |

## Reglas duras para los bots
1. Ningún bot accede a producción, al número de WhatsApp de TekFusion, a Supabase prod ni a credenciales.
2. Ningún bot escribe a clientes de TekFusion.
3. Ningún dato real de TekFusion (leads, contactos, conversaciones) entra al cerebro de Libux en Notion ni a un bot. Staging y datos semilla únicamente.
4. Todos los bots comparten un computador en la nube: no son barreras de seguridad entre sí. Por eso no guardan nada de TekFusion.
5. Sin modo de ensayo: toda prueba de un bot ejecuta acciones reales. Probar primero con tareas inocuas.
6. Aprobaciones del bot se gestionan por estado en Notion, no por tarjetas de 30 minutos.

## Cerebro en Notion (espacio "CRM TekFusion", separado del operativo de Libux)
Bases: **Decisiones** (fecha, decisión, motivo, fuente), **Changelog** (fecha, qué cambió, fase), **Bugs** (fingerprint único, pasos, captura, estado), **Tareas** (fase, responsable, estado), **Glosario** (términos del negocio), **Reportes semanales**. Regla: un solo escritor por base (Scribe escribe Decisiones/Changelog; QA escribe Bugs; Ignacio cierra).

## Conexión entre herramientas
- Claude Code → Notion: al cerrar sesión, `/handoff` genera `docs/handoffs/AAAA-MM-DD.md`; el Scribe lo lee (vía MCP de Notion o repo) y lo vuelca.
- n8n → bot: webhook de rutina con los números semanales del proyecto.
- Bot → Ignacio: cambios en Notion disparan aviso por Telegram (vía Gon o nodo de n8n).

## Secuencia de incorporación (según la práctica recomendada por xAI)
Tarea segura a mano → corregir → guardar como skill → convertir en rutina. QA entra en la semana 3–4 (cuando staging tiene pipeline y bandeja); Redactor en la semana 4; QA se pausa al salir a producción.

## Verificar antes de usarlos
- En qué plan de X/Grok está la cuenta de Libux y cuánto consumo semanal queda.
- Que la conexión Grok Bot ↔ Notion escribe en el espacio "CRM TekFusion" (prueba de un minuto).
