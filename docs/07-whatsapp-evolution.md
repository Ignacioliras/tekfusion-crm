# 07 · WhatsApp con Evolution API

## Decisión
- Se usa **Evolution API** con conexión Baileys (QR, como WhatsApp Web) sobre el **número corporativo único** de TekFusion. No la API oficial de Meta: evita plantillas aprobadas y permite seguimientos libres.
- Riesgo aceptado y escrito en el acuerdo: Meta puede bloquear el número. Mitigación: reglas anti-bloqueo (`03-reglas-negocio.md`) y fallback a Cloud API vía Evolution si ocurre.
- El teléfono físico con el número queda en la oficina de TekFusion, cargado y con wifi. Si está 14 días sin conexión, WhatsApp desvincula los dispositivos y hay que escanear el QR de nuevo.

## Instancia
- Docker en el VPS (`infra/docker-compose.yml`): `evolution-api` + su Postgres + Redis. Volúmenes respaldados a diario.
- Una instancia por ambiente: `tekfusion-prod` (número corporativo) y `tekfusion-staging` (número de prueba de Libux).
- Variables: `AUTHENTICATION_API_KEY`, `WEBHOOK_GLOBAL_URL` = URL de la Edge Function, `WEBHOOK_GLOBAL_ENABLED=true`, eventos `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`, `SEND_MESSAGE`.
- Condición de licencia (Apache 2.0 con condiciones): el panel de administración muestra en **Créditos** que el sistema usa Evolution API.

## Receptor (`supabase/functions/whatsapp-webhook`)
1. Verifica el header `apikey` contra el secreto; si no coincide, 401.
2. Por evento:
   - `messages.upsert`: normaliza (teléfono E.164, tipo, texto, `fromMe`, timestamp, `wa_message_id`). Upsert en `conversaciones` por teléfono. Insert en `mensajes` con `on conflict (wa_message_id) do nothing`. Si hay adjunto, lo descarga desde Evolution y lo guarda en Storage (`adjuntos-whatsapp/<conversacion>/<id>.<ext>`). Si la conversación no tiene `lead_activo_id` y el mensaje es entrante, dispara el flujo 02 (por trigger de Postgres). Si `fromMe` y no viene de nuestro envío (sin `job_id` conocido), marca `from_me_telefono=true` y `origen='telefono'`.
   - `messages.update`: actualiza `mensajes.estado` (entregado/leído) por `wa_message_id`.
   - `connection.update`: upsert en `estado_whatsapp`.
3. Siempre responde 200 (aunque el mensaje ya existiera) para que Evolution no reintente sin fin. Errores internos se registran y responden 200 con `{ok:false}`; la reconciliación (flujo 10) rescata lo que falte.
4. Tiempo objetivo: < 500 ms por evento.

## Envío (`supabase/functions/whatsapp-send` y flujo 03)
- Desde el CRM (manual): el ejecutivo envía texto/adjunto/cotización → la función llama a Evolution (`/message/sendText`, `/message/sendMedia`) → inserta el `mensaje` saliente con `job_id` y `autor_id` → actualiza estado con los eventos posteriores.
- Firma: se antepone/agrega `configuracion` de firma del ejecutivo (ej. "— Camila, TekFusion") en envíos automáticos; en envíos manuales es opcional (checkbox recordado).
- Automáticos (flujo 03 y 11): siempre dentro del horario hábil, con separación aleatoria de 45–90 s y tope diario (contador en `configuracion` o tabla `envios_diarios`).

## Bandeja en el CRM
- Lista de conversaciones con filtros Mis chats / Sin asignar / Todos (gerencia). Orden por `ultimo_mensaje_en`; contador `no_leidos`.
- Conversación: suscripción Realtime a `mensajes` donde `conversacion_id = X`. Burbujas con estado (✓, ✓✓, azul). Adjuntos con URL firmada (60 s). Audio con reproductor.
- Al abrir una conversación "sin asignar", el ejecutivo puede "Tomar" (se asigna a él) o gerencia puede asignar.
- Indicador global de conexión (verde/rojo) leído de `estado_whatsapp`; si está rojo, banner con enlace a Configuración → WhatsApp.

## Reconexión (Configuración → WhatsApp, solo gerencia)
- Muestra estado, número y último evento. Botón "Mostrar QR" llama a Evolution `/instance/connect` y muestra el QR en pantalla para escanear desde el teléfono corporativo.
- Botón "Reiniciar instancia" (confirmación doble).

## Reconciliación (flujo 10)
- Cada hora: para cada conversación activa, pide a Evolution los mensajes de la última hora y compara por `wa_message_id`. Inserta los que faltan. Registra en `actividades` de sistema cuántos rescató.

## Plan B si bloquean el número
1. Gerencia activa un número nuevo o registra el mismo en la Cloud API oficial (Meta Business verificado).
2. Evolution se reconfigura con el conector Cloud API; el webhook y el CRM no cambian.
3. Los seguimientos automáticos fuera de 24 h pasan a usar plantillas aprobadas (ajuste en flujo 03). Se cotiza aparte si ocurre.

## Pruebas obligatorias antes de salir a producción
- Mensaje entrante texto/imagen/PDF/audio aparece en < 3 s.
- Reenvío del mismo webhook no duplica.
- Envío desde el CRM llega y actualiza estados.
- Mensaje escrito desde el teléfono aparece atribuido al ejecutivo del lead.
- Desconexión simulada genera alerta en < 5 min y la reconexión por QR funciona.
- Seguimiento automático respeta horario hábil y tope.
