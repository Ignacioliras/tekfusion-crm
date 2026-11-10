# Manual de gerencia · CRM TekFusion

> **Borrador.** Describe las pantallas que existen hoy en el CRM. Lo marcado
> **(pendiente)** todavía no funciona: la pantalla existe o el dato se guarda,
> pero el envío, la recepción o la automatización real se activa más adelante
> (Fases 4 y 5).
>
> Todos los ejemplos usan datos ficticios del ambiente de pruebas (Andrea
> Soto, Camila Rojas, Diego Muñoz, Minera Cerro Cobrizo SpA, etc.). Ningún
> nombre corresponde a un cliente real.
>
> Lo que gerencia hace igual que un ejecutivo (pipeline, ficha del lead,
> cotizaciones, seguimientos, alertas, perfil) está en
> `docs/manual-ejecutivo.md`. Aquí va solo lo propio de gerencia.

## 1. Qué puedes hacer como gerencia

| Puedes                                                           | Solo gerencia |
| ---------------------------------------------------------------- | ------------- |
| Ver y editar **todos** los leads, de cualquier ejecutivo         | Sí            |
| **Reasignar** un lead a otro ejecutivo desde su ficha            | Sí            |
| Crear usuarios, editarlos, darlos de baja y definir suplentes    | Sí            |
| Entrar a **Configuración** (cadencia, horario, plantillas, etc.) | Sí            |
| Ver el **Ranking de ejecutivos** en el dashboard                 | Sí            |
| **Exportar** listas a CSV                                        | Sí            |
| **Anonimizar contacto**                                          | Sí            |
| Ver la pestaña **Todos** de la bandeja de WhatsApp               | Sí            |

El rol **Lector** solo mira: no ve botones de crear, editar ni borrar, ni la
bandeja de WhatsApp.

## 2. Entrar al CRM (verificación en dos pasos obligatoria)

Para gerencia la **Verificación en dos pasos** es obligatoria: sin ella el CRM
no te deja trabajar con los datos.

1. Escribe tu **Correo** y tu **Contraseña** y pulsa **Iniciar sesión**.
2. La primera vez, el CRM te pide activarla: escanea el código QR con Google
   Authenticator, Microsoft Authenticator o 1Password (o usa la clave que
   aparece bajo "Si no puedes escanear, ingresa esta clave a mano"), escribe el
   **Código de 6 dígitos** y pulsa **Confirmar**.
3. Las siguientes veces, después de la contraseña aparece **Verificación en dos
   pasos**: escribe el código de tu aplicación y pulsa **Entrar**.

Si cambias de celular, activa la aplicación en el nuevo antes de borrar la del
antiguo. Si pierdes el acceso, pide a Libux que reinicie tu verificación.

## 3. La barra superior

Además de lo que ve un ejecutivo, tienes:

- La pestaña **Configuración** (también en el menú de usuario).
- **Usuarios** en el menú de usuario (tu inicial, arriba a la derecha).
- Junto a la pestaña **WhatsApp**, el **punto de conexión** del número
  corporativo (sección 9).

## 4. Usuarios

Se abren desde **Configuración → Usuarios** o desde el menú de usuario →
**Usuarios**. La lista muestra a cada usuario con su rol y sus líneas.

### Alta

1. Pulsa **Nuevo usuario**.
2. Completa **Nombre**, **Apellido** y **Correo** (el correo @tekfusion.cl del
   ejecutivo).
3. Elige el **Rol**: **Gerencia**, **Ejecutivo** o **Lector**.
4. En **Líneas de negocio y ausencias**:
   - **Línea a cargo**: Válvulas, Tuberías y/o Geoceldas y geosintéticos. Los
     leads nuevos de esas líneas se asignan a este usuario.
   - **Suplente**: quién recibe sus leads nuevos mientras está ausente (vale
     para todas sus líneas). Puede quedar **Sin suplente**. Nadie puede ser su
     propio suplente.
5. Guarda. Verás "Usuario creado. Pronto recibirá un correo para definir su
   contraseña." El usuario elige su contraseña (mínimo 12 caracteres, con
   letras y números) desde ese correo.

### Editar, ausencias y suplentes

Abre al usuario en la lista para editarlo. Puedes cambiar rol, líneas,
suplente y la **Firma** con la que salen sus correos.

Para unas vacaciones o una licencia, agrega una fila en **Ausencias** con
**Desde**, **Hasta** y, si quieres, el **Motivo**. La fecha de término debe ser
igual o posterior a la de inicio. Mientras dure la ausencia, sus leads nuevos
van a su **Suplente**; los que ya tenía siguen a su nombre (si hace falta,
muévelos con **Reasignar** desde la ficha de cada lead).

### Baja

Cuando alguien deja la empresa, no se borra: se da de baja.

1. Abre al usuario y pulsa **Dar de baja**.
2. Confirma en "¿Dar de baja a …?".

Al confirmar:

- Se desactiva su acceso y se cierran sus sesiones.
- Cada lead abierto pasa al suplente de su línea (o queda **Sin asignar** si
  no hay suplente).
- Sus contactos, tareas pendientes y conversaciones de WhatsApp pasan a su
  suplente.
- Sus líneas pasan a su suplente.
- Queda registrado en el historial de auditoría.

Verás "Usuario dado de baja". Para reactivar la cuenta, abre al usuario,
desmarca **Desactivado** y guarda.

> Hoy la pantalla no muestra cuántos leads o conversaciones movió la baja.

## 5. Configuración

Pestaña **Configuración** (solo gerencia). Cada tarjeta guarda con el botón
**Guardar** de abajo, salvo los catálogos (plantillas, respuestas rápidas,
motivos de pérdida), que guardan cada cambio por su cuenta.

### Seguimientos y horario hábil

- **Cadencia por defecto (días)**: días después de enviar la cotización,
  separados por coma (por ejemplo `2, 5, 10`). Máximo 6, de menor a mayor y sin
  repetir. Es la cadencia que se programa al pulsar **Enviar cotización**.
- **Días hábiles** y horario **Desde** / **Hasta** (por defecto lunes a viernes,
  09:00 a 18:00).

> **(pendiente)** El horario hábil se respetará al enviar cuando los
> seguimientos salgan solos.

### Facturación y reporte semanal

- **Correo de facturación**: a quién se avisa cuando un lead se marca ganado
  **(pendiente)**.
- **Día del reporte semanal**, **Hora del reporte semanal** y **Destinatarios
  del reporte** (correos separados por coma) **(pendiente: el correo semanal lo
  envía n8n)**.
- **Retención de leads perdidos/archivados (meses)**: pasado ese plazo sin
  actividad, sus contactos se anonimizan solos (24 por defecto; 0 la desactiva).

### Leads → Etapas

Solo lectura: "Las etapas son fijas: las usan las reglas del CRM."

### Plantillas de seguimiento

**Agregar** una plantilla con **Nombre**, **Canal** (Correo o WhatsApp),
**Asunto** (solo correo) y **Mensaje**. Variables disponibles: `{{nombre}}`,
`{{empresa}}`, `{{producto}}` y `{{ejecutivo}}`; cualquier otra se rechaza. La
**Vista previa** muestra el texto con datos de ejemplo. Una plantilla se
**Desactiva** en vez de borrarse: deja de ofrecerse a los ejecutivos.

### Respuestas rápidas de WhatsApp

Textos que los ejecutivos insertan en la bandeja con **Respuestas rápidas**.
Cada una tiene **Título** y **Texto**, y se activa o desactiva igual que las
plantillas.

### Motivos de pérdida

La lista que aparece al marcar un lead como perdido. Puedes agregar,
renombrar, activar/desactivar y ordenar con **Subir** / **Bajar**.

### WhatsApp (conexión y QR)

> **(pendiente Fase 4)** La pantalla para reconectar el número escaneando el QR
> todavía no existe. Mientras tanto, la reconexión la hace Libux.

## 6. Dashboard

La pestaña **Dashboard** abre **Métricas comerciales**.

### Período

Elige el rango con **Desde** / **Hasta** o con un atajo: **Este mes**, **Mes
pasado**, **Últimos 30 días** (el de entrada), **Últimos 90 días**, **Últimos 12
meses** o **Este año**. Cada número se compara con el período anterior de igual
largo ("Comparado con el período anterior: …").

### Tarjetas

- **Leads**: cuántos entraron.
- **Primera respuesta promedio** y **Respondidos en 24 h**.
- **Tasa de cierre**.
- **Monto cotizado** y **Monto ganado**: se muestran abreviados (por ejemplo
  "$6 M"); pasa el mouse sobre la tarjeta para ver el monto exacto.

### Gráficos

**Leads por canal**, **Leads por línea**, **Embudo**, **Tasa de cierre por
línea**, **por canal** y **por mes**, y **Ganados / perdidos**.

Si no hay datos: "No hay leads en el período elegido."

Los ejecutivos y el lector ven las mismas métricas, sin el ranking.

## 7. Ranking de ejecutivos

Debajo de las métricas, solo para gerencia. Usa el mismo período del
dashboard y ordena a los ejecutivos por **Monto ganado**. Columnas:
**Ejecutivo**, **Leads atendidos**, **Primera respuesta promedio**,
**Cotizaciones enviadas**, **Ganados** y **Monto ganado**.

El ranking es privado: los ejecutivos no lo ven ni pueden consultarlo.

> **(pendiente)** El reporte semanal por correo (los mismos totales, cada
> lunes a los destinatarios de Configuración) lo envía n8n; el desglose por
> línea de negocio en ese correo también falta.

## 8. Exportar y anonimizar

### Exportar

En las listas (**Leads**, **Contactos**, **Empresas**) aparece el botón
**Exportar**, solo para gerencia. Descarga un CSV con lo que muestra la lista
con sus filtros. Cada exportación queda registrada (quién, qué, cuántas filas,
con qué filtros). Si ves "El archivo se descargó, pero no se pudo registrar la
exportación.", avisa a Libux.

Un CSV exportado contiene datos personales de clientes: no lo compartas fuera
de TekFusion ni lo subas a herramientas externas.

### Anonimizar contacto

Cuando un cliente pide que borren sus datos:

1. Abre la ficha del contacto (en el computador).
2. Pulsa **Anonimizar contacto**.
3. Lee el aviso y confirma con **Sí, anonimizar**.

Se reemplazan su nombre, correo y teléfono, y se borran el texto y los
adjuntos de sus notas. Sus leads, montos y etapas se conservan para las
métricas. **No se puede deshacer.** El contacto queda como "Contacto
anonimizado #…".

Lo mismo ocurre solo con la **retención** de Configuración (sección 5).

> **(pendiente)** Falta decidir qué pasa con el nombre del lead y los PDF de
> las cotizaciones (hoy no se tocan), y si anonimizar también archiva su
> conversación de WhatsApp.

## 9. Bandeja de WhatsApp

Pestaña **WhatsApp**. El número corporativo es uno solo; cada usuario ve lo que
le corresponde.

### Pestañas

- **Mis chats**: las conversaciones a tu nombre.
- **Sin asignar**: las que nadie ha tomado.
- **Todos**: todas las conversaciones de todos los ejecutivos (solo gerencia).

Cada conversación muestra cuántos mensajes tiene **sin leer**. Al abrir una
tuya con mensajes nuevos, se marca leída.

### Tomar y escribir

- En una conversación **Sin asignar**, pulsa **Tomar** para dejarla a tu
  nombre. Si alguien la tomó antes verás "La conversación ya no está
  disponible: la tomó alguien más o fue archivada."
- Puedes escribir en cualquier conversación asignada (tuya o de un ejecutivo).
  Escribe en **Escribe un mensaje** y pulsa **Enviar** (o Ctrl+Enter).
  **Respuestas rápidas** inserta un texto del catálogo.
- No se escribe en conversaciones sin asignar (primero se toman) ni
  archivadas.
- Si envías más de 30 mensajes en un minuto verás "Enviaste demasiados
  mensajes seguidos. Espera un minuto y vuelve a intentarlo."

Los mensajes escritos desde el teléfono del número corporativo aparecen con la
marca **Desde el teléfono**. Los mensajes nuevos llegan solos, sin recargar.

> **(pendiente Fase 4)** Hoy el mensaje queda guardado como **Pendiente**: el
> envío real por WhatsApp (con el tope diario, el espaciado y el horario hábil
> de las reglas anti-bloqueo) se activa cuando se conecte el número.

### Indicador de conexión

Junto a la pestaña **WhatsApp** hay un punto que se actualiza cada minuto:

- **Verde**: "WhatsApp conectado".
- **Rojo**: "WhatsApp desconectado". En la bandeja aparece además un aviso
  rojo: "Los mensajes no salen ni llegan hasta que se reconecte el número." con
  el enlace **Ir a Configuración** (solo gerencia).
- **Gris**: "No se pudo consultar el estado de WhatsApp".

Si el punto está rojo, avisa a Libux para reconectar el número.

> **(pendiente)** El aviso **WhatsApp desconectado** en la campana y por
> WhatsApp al celular, y el sondeo cada 5 minutos, los hace el flujo de
> monitoreo de n8n. Hoy el punto solo refleja el último cambio de estado que
> informó WhatsApp. En el celular (menú inferior) el punto no aparece.

## 10. Pendiente de fases siguientes

| Función                                                              | Fase   |
| -------------------------------------------------------------------- | ------ |
| Envío real de los mensajes de la bandeja de WhatsApp                 | Fase 4 |
| Pantalla de reconexión por QR (Configuración → WhatsApp)             | Fase 4 |
| Leads que entran solos desde correo, formulario, bot y WhatsApp      | Fase 5 |
| Envío real de cotizaciones y seguimientos automáticos                | Fase 5 |
| Alertas automáticas (sin contacto, sin asignar, por archivar, etc.)  | Fase 5 |
| Monitoreo del número y alerta de WhatsApp desconectado               | Fase 5 |
| Reporte semanal por correo (con desglose por línea)                  | Fase 5 |
| Correo a facturación al marcar ganado                                | Fase 5 |
| Archivado automático de leads sin movimiento                         | Fase 5 |
