# 03 · Reglas de negocio

Estas reglas son la lógica que implementan la base de datos, el frontend y los flujos de n8n. Si cambian, se actualiza este archivo primero.

## Estados del lead

| Estado | Entra cuando | Sale cuando |
|---|---|---|
| `nuevo` | Se crea el lead (automático o manual) | Primer contacto saliente del ejecutivo (→ `contactado`), o 14 días sin actualización (→ `archivado`, con aviso previo) |
| `contactado` | Hay al menos una acción saliente (correo, WhatsApp o nota "llamé") | Se envía una cotización (→ `cotizado`) o se marca perdido |
| `cotizado` | Se envía una cotización desde el CRM (automático) o se marca a mano | Se gana, se pierde o se archiva |
| `ganado` | Gerencia o ejecutivo lo marca; exige monto final | Final (se puede reabrir con nota) |
| `perdido` | Se marca; exige motivo | Final (se puede reabrir con nota) |
| `archivado` | Flujo diario, 48 h después del aviso a gerencia sin acción | Se reactiva a mano (→ vuelve al estado anterior) |

- "Actualización" para el archivado = cualquier cambio de estado, nota, mensaje saliente o reasignación.
- Pasar a `contactado` es **automático** cuando sale el primer mensaje o correo al cliente desde el CRM. También se puede marcar a mano (ej. contacto telefónico), con nota obligatoria.

## Asignación por línea de negocio

1. La IA clasifica el texto del lead en `valvulas`, `tuberias`, `geoceldas` o `indeterminada`, con un nivel de confianza.
2. Si la confianza es ≥ 0,7: se asigna al ejecutivo responsable de la línea. Si menciona dos líneas, manda la primera mencionada.
3. Si es `indeterminada` o confianza < 0,7: el lead queda `sin asignar` y se avisa a gerencia. Gerencia asigna con un clic; esa corrección se guarda para mejorar los ejemplos de clasificación.
4. Si el ejecutivo responsable está **ausente** en la fecha de ingreso, se asigna al **suplente**. Al volver, los leads **no** se devuelven automáticamente.
5. Toda asignación y reasignación queda en la línea de tiempo con autor y motivo.

## Primer contacto (24 horas)

- Cuenta desde la fecha de ingreso del lead, en horas corridas.
- A las **24 h sin acción saliente**: alerta al ejecutivo y a gerencia; gerencia puede reasignar desde la misma alerta.
- A las **48 h**: segunda alerta a gerencia, marcada como crítica.
- Un lead manual creado por el mismo ejecutivo también entra en la regla.

## Seguimientos

- Cadencia por defecto (configurable por gerencia; valor inicial propuesto): **día 2, día 5 y día 10** después de enviar la cotización.
- El ejecutivo puede: cambiar fechas, cambiar canal, cambiar modo (automático/recordatorio), agregar o quitar pasos, desactivar el seguimiento del lead.
- **Horario hábil** (configurable; valor inicial): lunes a viernes, 09:00–18:00 America/Santiago. Un seguimiento cuya hora cae fuera se envía en la próxima ventana hábil.
- **Se detiene** cuando: el cliente responde por correo o WhatsApp (cualquier mensaje entrante asociado al lead), o el lead pasa a ganado/perdido/archivado. Los pasos pendientes quedan `cancelados` con motivo.
- Si el seguimiento es por correo, sale desde la casilla del ejecutivo asignado (SMTP VíaRed) con su firma; la respuesta del cliente llega a esa casilla y el CRM la detecta por IMAP y la registra.
- Si es por WhatsApp, sale desde el número corporativo con la firma del ejecutivo; la respuesta llega a la bandeja y se enruta al ejecutivo asignado.
- Un seguimiento en modo recordatorio que no se envía a tiempo pasa a `vencido` y genera alerta.

## Reglas anti-bloqueo de WhatsApp (obligatorias para todo envío automático)

- Solo dentro del horario hábil.
- Separación mínima de **45–90 segundos aleatorios** entre envíos automáticos.
- Tope diario de envíos automáticos (valor inicial: **40 mensajes/día**); los que excedan se posponen al día siguiente.
- Mensajes siempre personalizados (nombre, empresa, producto); nunca el mismo texto idéntico a muchos contactos en poco tiempo.
- Nunca enviar a números que no hayan escrito antes **o** que no hayan entregado su teléfono en una consulta (formulario, bot, correo).
- Si un contacto pide no recibir mensajes, se marca `no_contactar` y se excluye de todo envío automático.

## Cotización

- Una cotización = PDF + monto (CLP, entero) + fecha + canal(es) de envío + versión. Puede haber varias versiones por lead; la última es la vigente.
- El monto de la cotización vigente alimenta el dashboard ("cotizado"); el monto final al ganar alimenta "ganado".

## Ganado / perdido

- `ganado`: monto final obligatorio (por defecto, el de la cotización vigente). Dispara el correo a facturación.
- `perdido`: motivo obligatorio de la lista; nota opcional.

## Deduplicación de leads

- Clave de coincidencia: correo normalizado **o** teléfono normalizado (formato E.164, +56…).
- Si existe un lead **activo** con esa clave: la nueva consulta se agrega como actividad "nueva consulta" al lead existente y se avisa al ejecutivo.
- Si el lead existente está cerrado o archivado: se crea un lead nuevo enlazado al anterior ("cliente recurrente").
- **Importación CSV (RF-15):** una fila cuyo contacto ya tiene un lead activo **se omite y se reporta** como duplicada; no se agrega como actividad (decisión de Ignacio, 2026-11-03, `docs/10`). Sin ejecutivo en la fila, el lead va al dueño de la línea; sin línea o sin dueño, queda sin asignar.

## Visibilidad por rol

| Dato | Gerencia | Ejecutivo | Lector |
|---|---|---|---|
| Leads | Todos, edita | Solo los suyos, edita | Todos, solo lee |
| Conversaciones de WhatsApp | Todas | Solo las de sus leads + sin asignar (lectura) | No |
| Dashboard | Completo, con ranking | Sin ranking, solo sus números | Sin ranking |
| Configuración | Sí | No | No |
| Reasignar | Sí | No | No |

## Datos sensibles

- Los datos de contactos de TekFusion son datos personales bajo la ley chilena (Ley 19.628; Ley 21.719 en transición). Mínimo: no exportarlos fuera del sistema sin autorización, registrar quién accede, permitir borrar un contacto si lo solicita. (No es asesoría legal.)
