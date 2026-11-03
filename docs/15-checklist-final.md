# 15 · Checklist final: lo que rodea al código

Lo técnico vive en `04`–`09`. Esto es lo que hace que un primer proyecto termine bien o en discusiones. Se revisa al cerrar cada fase.

## Con TekFusion
- [ ] **Acta de aceptación semanal.** Después de cada demo del viernes, un correo: "Hoy demostramos X, Y, Z. Quedó aprobado. Pendientes: …". Si no responden en 2 días hábiles, se da por aceptado (decirlo en el kickoff).
- [ ] **Un solo interlocutor.** Cambios y dudas entran como issues en GitHub (Libux los crea a partir de lo que digan). WhatsApp es para urgencias.
- [ ] **Dataset del clasificador:** 50 correos etiquetados por línea. Medir precisión en Fase 5. Sin esto no se promete "asignación automática".
- [ ] **Ensayo de migración** en staging con el CSV real antes de la migración definitiva; TekFusion valida totales por estado y por ejecutivo.
- [ ] **Plan de corte** (`docs/corte.md`, Fase 7): fecha y hora, qué pasa con correos y WhatsApp que llegan durante el cambio, quién avisa a los ejecutivos, criterio para volver atrás.
- [ ] **Calentamiento del número:** 10 días con volumen bajo y respuestas humanas antes de activar seguimientos automáticos.
- [ ] Lo que TekFusion pida fuera de `02-requisitos-funcionales.md` se responde "lo anoto para cotizar después"; nunca "sí, fácil".

## Operación
- [ ] Respaldos fuera de Supabase (R2) y prueba de restauración con reloj (Fase 5). Repetir cada 6 meses.
- [ ] `N8N_ENCRYPTION_KEY`, `.env` prod y códigos de 2FA en la bóveda compartida.
- [ ] Sentry en frontend y Edge Functions; Uptime Kuma avisando al WhatsApp/Telegram de Libux.
- [ ] Tope de gasto en Anthropic API; alerta de uso en Supabase (80 % del plan).
- [ ] Baja de usuario probada una vez en staging.
- [ ] `docs/incidente.md` escrito y leído por la contraparte.

## Entrega
- [ ] Manual corto por rol + 4 videos de 3 minutos (login y pipeline · ficha y cotización · bandeja WhatsApp · dashboard y configuración).
- [ ] Guía de reconexión del QR impresa al lado del teléfono corporativo.
- [ ] Checklist de traspaso de `13-acuerdo-comercial.md` completo: accesos, bóveda, repo, documentación, facturas.
- [ ] Aviso de privacidad y "Anonimizar contacto" funcionando (RF-17).
- [ ] Página Créditos visible.

## Modelo y esfuerzo en Claude Code (por tipo de tarea)
| Tarea | Modelo / esfuerzo |
|---|---|
| Arquitectura, RLS, webhook de WhatsApp, revisión de seguridad, decisiones | Fable 5.1, esfuerzo alto |
| Construcción diaria (pantallas, flujos n8n, dashboard) | Opus 5.5, esfuerzo normal |
| Sesiones nocturnas (tareas cerradas con tests) | Opus 5.5 |
| Debug que no sale tras 2 intentos | Fable 5.1, esfuerzo máximo (solo ahí) |

Las sesiones nocturnas gastan cuota del plan: revisar límites semanales antes de dejar 200 turnos corriendo.
