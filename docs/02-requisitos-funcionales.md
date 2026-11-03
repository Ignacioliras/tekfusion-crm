# 02 · Requisitos funcionales (alcance cerrado)

Todo lo que está aquí forma parte del desarrollo contratado. Lo que no está aquí es una mejora que se cotiza aparte (ver `13-acuerdo-comercial.md`).

## RF-01 · Acceso y roles
- Login con usuario (correo) y contraseña; recuperación de contraseña por correo.
- Tres roles: **gerencia** (ve y edita todo, configura, reasigna, ve ranking), **ejecutivo** (ve y edita solo sus leads, conversaciones y seguimientos), **lector** (solo lectura de leads y dashboard, sin ranking).
- Gerencia crea, desactiva y cambia el rol de usuarios desde Configuración.

## RF-02 · Ingreso de leads
- Fuentes: correo (Gmail de marketing, que concentra informacion@, formulario Wix y bot Chatonbo), WhatsApp (mensaje de un número desconocido o sin lead abierto) e ingreso manual (teléfono, feria, referido).
- Cada lead guarda: empresa, contacto, correo, teléfono, canal de origen, línea de negocio, producto/necesidad (texto), ejecutivo asignado, estado, fecha de ingreso, fuente cruda (correo original o primer mensaje).
- Deduplicación: si llega una consulta con el mismo correo o teléfono de un lead **activo** (no ganado/perdido/archivado), se adjunta como actividad a ese lead en vez de crear otro.

## RF-03 · Clasificación y asignación automática
- La IA lee el texto y devuelve: línea de negocio (o `indeterminada`), datos de contacto estructurados y resumen de una línea.
- Regla: se asigna al ejecutivo responsable de la línea detectada. Si es `indeterminada` o menciona varias líneas sin orden claro, el lead queda **sin asignar** y gerencia recibe aviso para asignarlo en un clic.
- Reemplazos: cada ejecutivo tiene un suplente y un estado (activo / ausente con rango de fechas). Si está ausente, se asigna al suplente.
- Gerencia puede reasignar cualquier lead en cualquier momento; la reasignación queda en el historial.

## RF-04 · Pipeline (kanban y lista)
- Estados: `nuevo` → `contactado` → `cotizado` → `ganado` | `perdido`; además `archivado`.
- Vista kanban con arrastrar y soltar, y vista lista con filtros (línea, ejecutivo, canal, estado, fecha) y búsqueda global.
- Al pasar a `perdido` es obligatorio elegir un motivo (lista configurable: precio, competencia, sin respuesta, sin presupuesto, otro) y opcionalmente una nota.
- Al pasar a `ganado`: se registra el monto final y se envía el aviso a facturación (RF-10).
- Exportar la lista filtrada a CSV.

## RF-05 · Ficha del lead
- Datos y estado, con edición en línea.
- Línea de tiempo única: mensajes de WhatsApp, correos enviados y recibidos, seguimientos automáticos, notas, cambios de estado y de asignación, con fecha y autor.
- Cotizaciones: PDF adjunto, monto, fecha, canal de envío, si fue entregada/leída (WhatsApp) y motivo de pérdida cuando corresponda.
- Próximo seguimiento programado, con opción de ajustar o cancelar.
- Botones: "Enviar cotización", "Programar seguimiento", "Marcar contactado", "Reasignar" (gerencia).

## RF-06 · Envío de cotización desde el CRM
- Subir PDF (generado afuera, en Excel) e ingresar monto.
- Enviar por correo (desde la casilla VíaRed del ejecutivo asignado, con su firma) y/o por WhatsApp (número corporativo, mensaje firmado con el nombre del ejecutivo).
- Al enviar: el estado pasa a `cotizado` automáticamente y se programa la cadencia de seguimientos por defecto.

## RF-07 · Seguimientos automáticos
- Cadencia por defecto configurable por gerencia (ej. día 2, 5 y 10 después de cotizar). El ejecutivo puede ajustar fechas y canales por lead, o desactivar el seguimiento.
- Cada seguimiento: canal (correo, WhatsApp o ambos), plantilla con variables (nombre, empresa, producto, ejecutivo), hora de envío dentro del horario hábil.
- Modo de cada seguimiento: **automático** (el sistema envía) o **recordatorio** (le avisa al ejecutivo para que lo envíe él).
- Se detiene solo cuando el cliente responde por cualquier canal, o cuando el lead pasa a ganado/perdido/archivado.
- Toda respuesta del cliente llega al ejecutivo asignado por el mismo canal y queda en la ficha.
- Plantillas de seguimiento editables por gerencia (texto propuesto por Libux, aprobado por TekFusion).

## RF-08 · Bandeja de WhatsApp dentro del CRM
- Un número corporativo único conectado por Evolution API.
- Vistas: **Mis chats** (asignados a mí), **Sin asignar**, **Todos** (solo gerencia).
- Conversación en tiempo real: texto, imágenes, PDF y audio (reproducción); estados enviado/entregado/leído; indicador de "escribiendo".
- Enviar texto, adjuntos y la cotización desde la ficha. Respuestas rápidas guardadas (configurables).
- Cada mensaje saliente lleva la firma del ejecutivo (configurable: "— Camila, TekFusion").
- Se registran también los mensajes escritos directamente desde el teléfono corporativo (`fromMe`), atribuidos al ejecutivo asignado del lead.
- Indicador de conexión del número y pantalla de reconexión por QR en Configuración (solo gerencia).

## RF-09 · Alertas
| Alerta | Condición | Destinatario | Canal |
|---|---|---|---|
| Lead sin contacto | 24 h en `nuevo` sin actividad saliente | Ejecutivo y gerencia | In-app + WhatsApp al número del ejecutivo |
| Seguimiento vencido | Recordatorio con fecha pasada y no enviado | Ejecutivo | In-app + WhatsApp |
| Cliente respondió | Mensaje o correo entrante en un lead | Ejecutivo asignado | In-app + WhatsApp |
| WhatsApp desconectado | Evolution reporta desconexión > 5 min | Gerencia y Libux | WhatsApp (ejecutivo de gerencia) + correo |
| Por archivar | 14 días en `nuevo` sin actualización | Gerencia | In-app + correo (lista semanal antes de archivar) |

Las alertas se centralizan en un panel in-app (campana) y se marcan como leídas.

## RF-10 · Ganado → facturación
- Al marcar `ganado`, se envía automáticamente un correo a la casilla de facturación (configurable) con empresa, contacto, línea, monto, PDF de la cotización y ejecutivo.

## RF-11 · Dashboard de gerencia
- Leads por canal y por línea (mes actual y comparación con el anterior).
- Tiempo promedio de primera respuesta y % dentro de 24 h.
- Embudo: nuevo → contactado → cotizado → ganado.
- Tasa de cierre por línea, canal y mes.
- Monto cotizado vs. ganado.
- Ranking por ejecutivo (leads atendidos, tiempo de respuesta, cotizaciones, cierres) — **visible solo para gerencia**.
- Filtros por rango de fechas. Ejecutivos y lectores ven una versión sin ranking.

## RF-12 · Reporte semanal automático
- Día y hora configurables. Se envía por correo (y opcionalmente WhatsApp) a gerencia con el resumen de la semana: entradas, contactados, cotizados, ganados, perdidos con motivos, leads sin atender, vencidos.

## RF-13 · Archivado
- Un flujo diario detecta leads con más de 14 días en `nuevo` sin actualización. Primero avisa a gerencia (RF-09); si no hay acción en 48 h, archiva. Un lead archivado se puede reactivar.

## RF-14 · Configuración (solo gerencia)
- Líneas de negocio, ejecutivos por línea, suplentes y ausencias.
- Cadencia de seguimiento por defecto, horario hábil, plantillas, respuestas rápidas, firmas.
- Motivos de pérdida. Correo de facturación. Destinatarios y horario del reporte semanal.
- Estado del WhatsApp y reconexión por QR.
- Página **Créditos** (componentes de terceros y aviso de Evolution API).

## RF-15 · Migración
- Importar el Google Sheets actual (CSV) con mapeo de columnas, deduplicación y asignación de estados; marcar el origen como `migracion`.

## RF-16 · Rendimiento y disponibilidad
- Los mensajes entrantes de WhatsApp aparecen en la bandeja en menos de 3 segundos.
- Respaldos diarios de la base de datos (Supabase Pro) y del volumen de Evolution.
- Monitoreo con Uptime Kuma: CRM, Supabase, Evolution, n8n.

## RF-17 · Protección de datos personales (incluido por Libux, sin costo)
- Aviso de privacidad (texto corto) para el formulario web y plantilla de respuesta al derecho de acceso/eliminación.
- "Anonimizar contacto" (solo gerencia): reemplaza nombre, correo y teléfono por valores anónimos y borra adjuntos; las métricas se conservan. Queda en `actividades`.
- Retención: leads perdidos/archivados se anonimizan a los 24 meses (configurable por gerencia; puede desactivarse).
- Motivo: ley 21.719, vigente desde diciembre de 2026, justo cuando el CRM entra en producción.

## Mejoras propuestas por Libux (NO comprometidas; se incluyen solo si Ignacio lo confirma)
Son baratas y mejoran el uso diario, pero no están en el acuerdo. Si se incluyen, van en Fase 3 y se anota en `10-decisiones.md`. Si TekFusion las pide después, se cotizan aparte.
1. Acuse de recibo automático al cliente al crear el lead ("Recibimos tu consulta, te contacta X").
2. Feriados chilenos en el calendario de envíos (sin seguimientos en feriados).
3. Auto-respuesta fuera de horario por WhatsApp.
4. Fusión manual de leads duplicados.
5. Posponer una alerta ("recordar mañana").
6. Notas con mención a otro usuario (@nombre) que genera alerta.
7. Registro de llamada telefónica como actividad (resultado + próxima acción).
8. Botón "No contactar" en el contacto (bloquea seguimientos automáticos).
9. Reasignación masiva (seleccionar varios leads → cambiar ejecutivo).
10. Vista "Mi día" para el ejecutivo: seguimientos de hoy, leads sin contacto, respuestas pendientes.
11. Registro de auditoría de configuración (quién cambió qué en Configuración).

## Fuera de alcance (se cotiza aparte)
- App móvil nativa o chat de WhatsApp desde el celular.
- Generador de cotizaciones (reemplazo del Excel).
- Integración con ERP/facturación electrónica.
- Varios números de WhatsApp o API oficial de Meta.
- Campañas masivas por WhatsApp o correo.
- Más de 3 líneas de negocio o más de 10 usuarios sin revisión de capacidad.
