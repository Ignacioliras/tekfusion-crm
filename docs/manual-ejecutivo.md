# Manual del ejecutivo · CRM TekFusion

> **Borrador.** Describe las pantallas que existen hoy en el CRM. Lo marcado
> **(pendiente Fase 4/5)** todavía no funciona: la pantalla existe o el dato se
> guarda, pero el envío o la recepción real se activa en esas fases.
>
> Todos los ejemplos usan datos ficticios del ambiente de pruebas (Camila Rojas,
> Diego Muñoz, Minera Cerro Cobrizo SpA, etc.). Ningún nombre corresponde a un
> cliente real.

## 1. Qué puedes hacer como ejecutivo

| Puedes                                                        | No puedes                               |
| ------------------------------------------------------------- | --------------------------------------- |
| Ver y editar **tus** leads                                    | Editar leads de otro ejecutivo          |
| Ver los leads **sin asignar** y tomarlos con **Tomar**        | Reasignar leads (solo gerencia)         |
| Crear leads a mano                                            | Entrar a **Configuración**              |
| Enviar cotizaciones y programar, ajustar o cancelar seguimientos | Ver el ranking de ejecutivos         |
| Ver tus alertas y marcarlas como leídas                       | Editar plantillas o motivos de pérdida  |

Si un botón de esta guía no te aparece, es porque ese lead no es tuyo (o todavía
no lo has tomado).

## 2. Entrar al CRM

1. Abre el CRM en el navegador del computador.
2. Escribe tu **Correo** y tu **Contraseña** y pulsa **Iniciar sesión**.
3. Si no recuerdas la contraseña, pulsa **¿Olvidaste tu contraseña?**, escribe
   tu correo y sigue el enlace que te llega.

### Verificación en dos pasos (opcional para ejecutivos)

Para gerencia es obligatoria; para ti es opcional, pero recomendada.

**Activarla:**

1. Abre el menú de usuario (tu inicial, arriba a la derecha) → **Perfil**.
2. En el recuadro **Verificación en dos pasos** (dice **No activada**), pulsa
   **Activar**.
3. Escanea el código QR con Google Authenticator, Microsoft Authenticator o
   1Password. Si no puedes escanear, usa la clave que aparece bajo "Si no puedes
   escanear, ingresa esta clave a mano".
4. Escribe el **Código de 6 dígitos** que muestra la aplicación y pulsa
   **Confirmar**. Verás "Verificación en dos pasos activada".

**Entrar con la verificación activa:** después de la contraseña aparece la
pantalla **Verificación en dos pasos**. Escribe el código de tu aplicación y
pulsa **Entrar**. Si el código falla verás "Código incorrecto. Inténtalo de
nuevo."; desde ahí también puedes **Cerrar sesión**.

**Desactivarla:** en **Perfil**, recuadro **Verificación en dos pasos**, pulsa
**Desactivar**.

## 3. La barra superior

- Pestañas: **Pipeline** (kanban), **Leads** (tabla), **Contactos**,
  **Empresas**, **WhatsApp** y **Dashboard**.
- A la derecha: la búsqueda, la **campana de alertas**, el tema claro/oscuro, el
  botón de recargar y el menú de usuario (**Perfil**, **Novedades**,
  **Créditos**, **Cerrar sesión**).
- La pestaña **WhatsApp** hoy muestra "Disponible en la Fase 4" **(pendiente
  Fase 4/5)**.

## 4. Pipeline (kanban)

La pestaña **Pipeline** muestra los leads en columnas por etapa: **Nuevo**,
**Contactado**, **Cotizado**, **Ganado**, **Perdido** y **Archivado**.

### Filtros

Sobre el tablero tienes:

- **Buscar**: texto libre.
- **Ejecutivo**: casilla **Solo mis leads** para ver solo los tuyos.
- **Línea de negocio**: Válvulas, Tuberías, Geoceldas y geosintéticos.
- **Canal de origen**: Correo, Formulario web, Bot del sitio, WhatsApp, Ingreso
  manual, Migración.
- **Creado desde** / **Creado hasta**.

La pestaña **Leads** muestra lo mismo en tabla y agrega el filtro **Etapa**.

### Mover un lead de etapa

Arrastra la tarjeta a otra columna. Solo puedes arrastrar **tus** leads: las
tarjetas de otros ejecutivos y las sin asignar se ven, pero no se mueven.

- **A Ganado:** se abre **Marcar como ganado**. Escribe el **Monto final**
  (viene con el monto del lead; corrígelo si cambió) y pulsa **Confirmar**. Es
  obligatorio: sin monto no se puede marcar ganado.
- **A Perdido:** se abre **Marcar como perdido**. Elige el **Motivo de pérdida**
  (obligatorio; la lista la define gerencia) y, si quieres, una **Nota
  (opcional)**. Pulsa **Confirmar**.
- Si pulsas **Cancelar**, el lead no cambia de etapa.

> El aviso a facturación al marcar un lead como ganado se envía desde n8n
> **(pendiente Fase 4/5)**.

### Leads archivados

Al pie del tablero, **Ver leads archivados** abre la lista **Leads archivados**.
Un lead archivado se reactiva con **Devolver al tablero** desde su ficha. Para
archivar uno tuyo a mano, usa **Archivar** en su ficha.

## 5. Ficha del lead

Haz clic en una tarjeta para abrir la ficha. Ejemplo: "Válvulas mariposa DN200
para planta", de Minera Cerro Cobrizo SpA, a cargo de Camila Rojas.

### Barra de acciones

| Botón                     | Cuándo aparece                                      |
| ------------------------- | --------------------------------------------------- |
| **Tomar**                 | El lead está sin asignar                            |
| **Marcar contactado**     | El lead es tuyo y está en Nuevo                     |
| **Enviar cotización**     | El lead es tuyo y está en Nuevo, Contactado o Cotizado |
| **Programar seguimiento** | Igual que el anterior                               |
| **Ganado** / **Perdido**  | Igual que el anterior; abren los mismos diálogos del kanban |
| **Reasignar**             | Solo gerencia                                       |

Arriba a la derecha están **Archivar** y **Editar** (formulario completo del
lead).

### Tomar un lead sin asignar

Cuando la IA no logra decidir la línea, el lead queda **Sin asignar**. Si es de
tu línea, ábrelo y pulsa **Tomar**: pasa a tu nombre y verás "Tomaste el lead".
Si otro ejecutivo lo tomó antes, verás "El lead ya no está disponible".

### Marcar contactado

Si hablaste con el cliente por teléfono o en persona, pulsa **Marcar
contactado**: el lead pasa a Contactado y verás "Lead marcado como contactado".

> El paso automático a Contactado cuando sale el primer correo o WhatsApp desde
> el CRM depende de esos envíos **(pendiente Fase 4/5)**.

### Datos del lead

La columna izquierda muestra **Datos del lead**: **Etapa**, **Línea de
negocio**, **Canal de origen**, **Ejecutivo**, **Contacto**, **Empresa**,
**Monto** y, si corresponde, **Monto final** y **Motivo de pérdida**.

Para corregir **Línea de negocio**, **Canal de origen**, **Contacto** o
**Empresa**, pulsa el lápiz junto al campo, cambia el valor y pulsa **Guardar**
(o **Cancelar**). La etapa se cambia con el kanban o los botones, no aquí.

Debajo están **Seguimientos** (ver sección 8) y **Cotizaciones** (historial de
versiones, con **Ver PDF**; la última dice **Vigente**).

### Línea de tiempo

La columna derecha, **Línea de tiempo**, junta todo lo que pasó en el lead, con
fecha y autor ("por Camila Rojas", o "El sistema"). Ejemplos de lo que verás:

- "Lead creado · Ingreso manual"
- "Etapa: Nuevo → Contactado"
- "Asignado a Diego Muñoz" / "Reasignado de Camila Rojas a Diego Muñoz"
- "Cotización v1 · $4.500.000" y su estado de envío
- "Seguimiento 2 cancelado · Cancelado por el ejecutivo"
- "Seguimiento 3 vencido sin enviar"
- "Alerta · …"

Si el lead es nuevo y no tiene nada: "Todavía no hay actividad en este lead."

> Los mensajes de WhatsApp y los correos enviados y recibidos aparecerán en la
> línea de tiempo cuando se conecten esos canales **(pendiente Fase 4/5)**.

## 6. Nuevo lead (ingreso manual)

Para una consulta que llegó por teléfono, feria o referido:

1. En **Pipeline**, pulsa **Nuevo lead**.
2. **Producto / lo que pide**: por ejemplo "Tubería HDPE PE100 SDR11 de 250 mm".
   Es obligatorio.
3. **Empresa**: búscala; si no existe, escríbela y elige "Crear …".
4. **Contacto**: elige uno de esa empresa o escribe el nombre y elige "Crear …".
   Se abre **Nuevo contacto** con **Nombre**, **Apellido**, **Correo** y
   **Teléfono** (formato +56 9 1234 5678).
5. **Línea de negocio**: se sugiere sola según el producto; puedes cambiarla.
6. **Monto (CLP, opcional)**: entero, sin decimales.
7. El **Canal de origen** queda como **Ingreso manual** y el lead queda a tu
   nombre, en **Nuevo**.
8. Guarda. Se abre la ficha del lead recién creado.

Un lead manual también cuenta para la regla de 24 horas: si no lo contactas, te
llegará la alerta (cuando se activen los flujos de alertas, **pendiente Fase
4/5**).

## 7. Enviar cotización

La cotización se arma afuera (Excel) y se sube como PDF.

1. En la ficha, pulsa **Enviar cotización**.
2. **PDF de la cotización**: solo PDF, hasta 15 MB.
3. **Monto (CLP, sin decimales)**: viene con el monto del lead.
4. **Enviar por**: activa **Correo**, **WhatsApp** o ambos (al menos uno).
5. Pulsa **Enviar cotización**.

Verás "Cotización v1 en cola de envío; seguimientos programados". El lead pasa a
**Cotizado** y se programa la cadencia de seguimientos que definió gerencia (por
ejemplo, días 2, 5 y 10). Si ya había una cotización, el diálogo avisa
"Reemplaza a la versión v1, que queda en el historial." y la nueva pasa a ser la
**Vigente**.

Si el lead tiene los seguimientos desactivados, el diálogo lo avisa y no se
programan.

> **(pendiente Fase 4/5)** Hoy la cotización queda **en cola**: el envío real
> por correo (desde tu casilla, con tu firma) y por WhatsApp (número
> corporativo) lo hará n8n cuando se conecten esos canales. Los estados
> "entregada" y "leída" llegan con WhatsApp.

## 8. Seguimientos

En la ficha, el bloque **Seguimientos** muestra el **Próximo seguimiento** y,
debajo, el resto de la cadencia y el historial. Cada uno indica **Paso N**, su
estado (**Pendiente**, **Enviado**, **Vencido** o **Cancelado**), fecha y hora
(hora de Santiago), canales y modo.

Si no hay ninguno: "No hay seguimientos programados."

### Programar uno a mano

1. Pulsa **Programar seguimiento**.
2. **Fecha y hora**: viene el próximo día hábil a las 10:00. Debe ser futura.
3. **Canales**: **Correo**, **WhatsApp** o ambos.
4. **Modo**:
   - **Automático (lo envía el sistema)**: necesita el texto listo.
   - **Recordatorio (te avisa para que lo envíes tú)**: solo te avisa; tú lo
     envías.
5. Por cada canal elegido aparece **Mensaje por correo** / **Mensaje por
   WhatsApp**: elige una **Plantilla** (o **Sin plantilla**) y el texto se
   rellena con el nombre del contacto, la empresa, el producto y tu firma.
   Puedes retocarlo o escribirlo desde cero. El correo además pide **Asunto**.
6. Pulsa **Guardar**. Verás "Seguimiento guardado".

### Ajustar

En un seguimiento **Pendiente** o **Vencido**, pulsa **Ajustar**: se abre
**Ajustar seguimiento** con los mismos campos. Al guardar vuelve a quedar
**Pendiente**.

### Cancelar

Pulsa **Cancelar seguimiento**, escribe (si quieres) el **Motivo de la
cancelación** y confirma con **Cancelar seguimiento**. Si no escribes motivo,
queda "Cancelado por el ejecutivo".

### Plantillas

Las plantillas las crea y edita **gerencia** en Configuración → **Plantillas de
seguimiento**. Tú solo las eliges al programar o ajustar. Las variables que
rellenan son `{{nombre}}`, `{{empresa}}`, `{{producto}}` y `{{ejecutivo}}` (esta
última usa tu **Firma** del perfil).

> **(pendiente Fase 4/5)** El envío automático de los seguimientos, el respeto
> del horario hábil al enviar y la detención automática cuando el cliente
> responde se activan con n8n, el correo y WhatsApp. Hoy los seguimientos quedan
> programados y visibles, pero no salen solos.

## 9. Alertas

La **campana** de la barra superior muestra cuántas alertas tienes sin leer.
Al abrirla verás el panel **Alertas**, agrupado por tipo:

- **Sin contacto en 24 h** / **Sin contacto en 48 h**: lead en Nuevo sin
  contacto.
- **Seguimiento vencido**: un recordatorio que no se envió a tiempo.
- **Cliente respondió** **(pendiente Fase 4/5)**.
- **Sin asignar**, **Por archivar** y **WhatsApp desconectado**: son para
  gerencia.

Cada alerta dice qué pasó (por ejemplo, "sin contacto hace 26 h"), el lead y
hace cuánto. Botones:

- **Ver lead**: abre la ficha.
- **Marcar leída**: la saca del panel.
- **Marcar todas como leídas**: arriba del panel.

Sin alertas: "No tienes alertas pendientes."

> **(pendiente Fase 4/5)** La campana y el panel ya funcionan, pero las alertas
> las crean flujos automáticos (sin contacto en 24/48 h, seguimiento vencido,
> cliente respondió) que se activan en esas fases, igual que el aviso de cada
> alerta por WhatsApp a tu celular.

## 10. Perfil (firma)

Menú de usuario → **Perfil**.

1. Pulsa **Editar**.
2. Revisa **Nombre**, **Apellido**, **Correo** y **Correos secundarios**.
3. En **Firma** escribe cómo quieres firmar, por ejemplo "— Camila Rojas,
   TekFusion". Se agrega al final de los correos enviados a tu nombre y es lo
   que rellena `{{ejecutivo}}` en las plantillas.
4. Pulsa **Guardar** (o **Cancelar**). Verás "Tu perfil fue actualizado".

**Cambiar contraseña** te envía un correo con el enlace para elegir una nueva.

En esta misma página está la **Verificación en dos pasos** (sección 2).

## 11. Pendiente de fases siguientes

| Función                                                    | Fase       |
| ---------------------------------------------------------- | ---------- |
| Bandeja de WhatsApp (Mis chats, Sin asignar)               | Fase 4/5   |
| Leads que entran solos desde correo, formulario, bot y WhatsApp | Fase 4/5 |
| Envío real de cotizaciones por correo y WhatsApp           | Fase 4/5   |
| Seguimientos automáticos y detención al responder el cliente | Fase 4/5 |
| Creación automática de alertas y avisos por WhatsApp al celular | Fase 4/5 |
| Archivado automático de leads sin movimiento (14 días)     | Fase 4/5   |
| Correo a facturación al marcar ganado                      | Fase 4/5   |
