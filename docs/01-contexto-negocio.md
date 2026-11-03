# 01 · Contexto de negocio

## El cliente
- **TekFusion**: empresa chilena B2B. Vende por tres líneas de negocio: **válvulas**, **tuberías** y **geoceldas / geosintéticos**.
- Cotiza a medida (diámetros, longitudes, cantidades); no hay precios estándar. La cotización la arman en Excel y sale como PDF.
- Equipo comercial: **2 ejecutivos** (cada uno lleva una o dos líneas) y **gerencia**. Hay además usuarios de solo lectura (área comercial). Total de personas por confirmar (ver `11-pendientes-kickoff.md`).
- Correo corporativo: casillas `@tekfusion.cl` alojadas en **VíaRed** (hosting chileno; panel en cpanel.viared.cl).
- Cuando un negocio se gana, pasa a **facturación** (aviso por correo).

## Cómo funciona hoy (antes del CRM)
1. Las consultas entran por tres canales:
   - Correo directo a `informacion@tekfusion.cl` (rebota a `marketingtekfusion@gmail.com`).
   - Formulario web en Wix (llega a `marketingtekfusion@gmail.com`).
   - Bot del sitio (Chatonbo), que captura nombre, apellido, correo, etc. y envía un resumen a `marketingtekfusion@gmail.com`.
2. Un script lee ese Gmail y vuelca los leads en un Google Sheets.
3. Ese Sheets funciona como CRM, publicado para que los comerciales entren.
4. Estados actuales: nuevo (por defecto), contactado, cotizado, ganado, perdido, archivado (automático al cumplir cierto tiempo).

## El dolor real
- **No es cotizar.** Es el **seguimiento**: saber si el cliente recibió la cotización, si tiene dudas, si necesita algo más. Depende de la memoria y el tiempo de cada ejecutivo.
- La **asignación** por línea de negocio se hace a mano.
- **Gerencia no ve** el estado real: cuántas consultas hay, quién las tiene, cuánto llevan sin respuesta.

## El dato clave
- Llegan **~100 consultas al mes** y se cotiza el **20 %**. Cerca de **80 oportunidades al mes se enfrían antes de recibir una cotización**. La fuga más grande está *antes* de cotizar; el sistema ataca el primer contacto (alerta a 24 h) y el seguimiento posterior.

## Lo que TekFusion respondió en el levantamiento (oct 2026)
| Tema | Respuesta |
|---|---|
| Líneas de negocio | Válvulas, Tuberías, Geoceldas/geosintéticos |
| Lead con varias líneas | Se asigna según la primera que mencione (sin regla formal todavía) |
| Volumen | ~100 leads/mes, 20 % cotizado |
| Correo ejecutivos | @tekfusion.cl en VíaRed |
| Cotización | Excel → PDF |
| Monto por cotización | Los ejecutivos pueden registrarlo |
| Al ganar | Pasa a facturación |
| Tiempo máximo primer contacto | 24 horas |
| Si no se cumple | Avisar a gerencia **y** poder reasignar; notificar el vencimiento |
| WhatsApp corporativo | Sí, tienen número |
| Métricas | Leads por canal y por línea, tiempo de respuesta, funnel, tasa de cierre; ranking de ejecutivos **solo para gerencia** (no visible entre trabajadores) |
| Reporte automático | Sí |
| Usuarios | 2 ejecutivos; área comercial con vista de lector (4 personas) — total por confirmar |
| Login | Usuario y clave |
| Archivado | Cuando lleva más de 14 días en "nuevo" sin actualización |

## Historial comercial relevante
- Libux presentó una primera propuesta meses atrás; TekFusion dejó de responder y construyó una versión propia (Gmail + script + Sheets + GitHub).
- En octubre de 2026 volvieron a contactar a Libux. La propuesta de CRM a medida fue aceptada; kickoff el 28 de octubre de 2026.
- Este es el primer sistema a medida con IA que Libux entrega a una empresa. La calidad de este proyecto es el caso de referencia para los siguientes.
