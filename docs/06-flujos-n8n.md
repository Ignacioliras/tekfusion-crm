# 06 · Flujos de n8n

Cada flujo se exporta a `n8n/flows/NN-nombre.json`. Reglas comunes:
- Idempotentes: antes de enviar, verificar en Postgres que no se envió (`enviado_en is null`); al enviar, escribir `job_id` y `enviado_en` en la misma transacción lógica.
- Manejo de errores: nodo de error → registrar en `actividades` tipo `sistema` y avisar a Libux (Telegram/correo).
- Todo envío respeta `configuracion.horario_habil`, `tope_envios_dia` y `separacion_envios_seg` (reglas anti-bloqueo).
- Credenciales de n8n: Supabase service role (solo aquí), Evolution API key, SMTP/IMAP por ejecutivo, Gmail IMAP, Anthropic.

| # | Flujo | Disparador | Qué hace |
|---|---|---|---|
| 01 | Ingreso de leads por correo | IMAP Gmail marketing, cada 2 min (o IMAP IDLE) | Lee correos nuevos → detecta origen (informacion@, Wix, Chatonbo) por remitente/asunto → extrae texto → llama a la IA (`prompts/clasificar-lead.md`) → upsert `contactos` → dedupe de lead activo → `leads` + `actividades` → `fn_asignar_lead` → si queda sin asignar, alerta `sin_asignar` a gerencia → aviso WhatsApp al ejecutivo asignado |
| 02 | Ingreso de leads por WhatsApp | Postgres trigger/webhook: nueva `conversacion` sin `lead_activo_id` | Toma el primer mensaje → IA clasifica → crea `lead` (canal `whatsapp`) → asigna → actualiza `conversaciones.ejecutivo_id` → aviso al ejecutivo |
| 03 | Motor de seguimientos | Cron cada 15 min | Busca `seguimientos` pendientes con `programado_para <= now()` dentro de horario hábil → modo `automatico`: renderiza plantilla y envía por correo (SMTP del ejecutivo) y/o WhatsApp (Evolution, firmado) respetando separación y tope → marca `enviado`, crea `actividades` y `mensajes`/`correos`; modo `recordatorio`: crea alerta `seguimiento_vencido` si ya pasó la hora, si no, aviso al ejecutivo |
| 04 | Detector de respuestas por correo | IMAP de cada ejecutivo, cada 2 min | Lee entrantes → empareja por `In-Reply-To`/`References` o por remitente = contacto de un lead activo del ejecutivo → inserta `correos` + `actividades` → `fn_cancelar_seguimientos` → alerta `cliente_respondio` |
| 05 | Alertas de primer contacto | Cron cada 30 min | Leads `nuevo` con `primer_contacto_en null` y `creado_en < now() - 24h` → alerta al ejecutivo y gerencia (+ WhatsApp); a 48 h, alerta crítica a gerencia |
| 06 | Archivado | Cron diario 08:00 | Leads `nuevo` con `ultima_actividad_en < now() - 14 días` → alerta `por_archivar` a gerencia con lista → 48 h después, si siguen sin actividad, estado `archivado` + actividad `sistema` |
| 07 | Ganado → facturación | Postgres webhook al cambiar `estado` a `ganado` | Correo a `configuracion.correo_facturacion` con datos del lead, monto y PDF vigente adjunto |
| 08 | Monitoreo de WhatsApp | Webhook `connection.update` de Evolution + cron cada 5 min (`/instance/connectionState`) | Actualiza `estado_whatsapp`; si desconectado > 5 min: alerta `whatsapp_desconectado` a gerencia (WhatsApp del gerente, correo) y a Libux; al reconectar, cierra la alerta |
| 09 | Reporte semanal | Cron según `configuracion.reporte_semanal` | Consulta `vista_dashboard_mensual` acotada a la semana → arma resumen (texto + tabla) → envía por correo (y WhatsApp opcional) a destinatarios |
| 10 | Reconciliación de mensajes | Cron cada hora | Pide a Evolution los mensajes de la última hora por chat → compara con `mensajes.wa_message_id` → inserta los que falten |
| 11 | Avisos al ejecutivo | Postgres webhook en `alertas` (insert) | Si el destinatario tiene `telefono_whatsapp`, envía el aviso por WhatsApp (número corporativo → número del ejecutivo) y marca `enviada_whatsapp_en`. Separación y tope aplican. |

## Prompt de clasificación (resumen; completo en `n8n/prompts/clasificar-lead.md`)
- Entrada: texto del correo/mensaje + lista de líneas con palabras clave desde `lineas_negocio`.
- Salida JSON estricta: `{ "linea": "valvulas|tuberias|geoceldas|indeterminada", "confianza": 0-1, "empresa": string|null, "nombre": string|null, "correo": string|null, "telefono": string|null, "necesidad": string (≤ 200 caracteres), "es_spam": boolean }`.
- Reglas: no inventar datos (usar `null`), teléfono en E.164 si es posible, `es_spam` para newsletters/proveedores; los correos marcados spam se guardan en `actividades` de sistema, no crean lead.

## Pruebas de cada flujo
- Ejecutar contra staging con datos semilla y un correo/número de prueba de Libux.
- Verificar: no duplica al reejecutar; respeta horario hábil; registra actividad; falla con aviso cuando una credencial es inválida.
