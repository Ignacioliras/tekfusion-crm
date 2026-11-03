# 13 · Acuerdo comercial (resumen para respetar el alcance)

Esto es lo que TekFusion contrató. Claude Code lo usa para saber qué entra y qué no. No reemplaza al contrato.

## Desarrollo (pago único)
- **$1.200.000 + IVA.** 50 % al iniciar, 50 % al entregar funcionando.
- Incluye: diseño del sistema a la medida, construcción (CRM, WhatsApp, correo, automatizaciones), migración del Sheets, marcha blanca y capacitación. Alcance: `02-requisitos-funcionales.md`.
- **El sistema queda a nombre de TekFusion:** código desarrollado por Libux cedido a TekFusion, más la lista de componentes de terceros con sus licencias (Atomic CRM MIT, Evolution API Apache 2.0 con condiciones, n8n Sustainable Use License, shadcn/ui MIT, etc.). Cuentas creadas a nombre de TekFusion.
- Plazo estimado: 5 a 7 semanas desde que TekFusion entrega los accesos (`11-pendientes-kickoff.md`). Compromiso de comunicación: 7 semanas.

## Plan de mantención (opcional, sin permanencia)
- **$100.000 + IVA al mes**, desde el tercer mes de operación (los dos primeros van incluidos, contados desde la entrega funcionando).
- Incluye: costos de plataforma (Supabase, VPS, dominio, IA), WhatsApp y automatizaciones funcionando, monitoreo y corrección de fallas, soporte al equipo (dudas de uso, reconexión de WhatsApp, usuarios y contraseñas).
- No incluye: funciones nuevas, cambios de flujo, integraciones. Se cotizan aparte, en horas, con precio cerrado antes de empezar.
- Si TekFusion no toma el plan: asume directamente los costos de la plataforma y la resolución de fallas, sin soporte de Libux. Si deja de pagar: suspensión a los 30 días.

## Riesgos aceptados por escrito
- Uso de Evolution API (no oficial): Meta puede bloquear el número. Mitigaciones en `07-whatsapp-evolution.md`.
- El teléfono corporativo debe permanecer conectado.

## Checklist de traspaso (al entregar, y si algún día dejan el plan)
- [ ] Repositorio GitHub transferido/compartido con cuenta de TekFusion.
- [ ] Supabase, Cloudflare, Hostinger, Anthropic: titularidad TekFusion, Libux como administrador (o removido si terminan).
- [ ] Documentación: este `docs/`, `infra/README.md`, manual de usuario.
- [ ] Exportación completa de datos (CSV + PDFs) a solicitud.
- [ ] Rotación de claves al cambiar de administrador.

*Nada de lo anterior es asesoría legal; el contrato debe revisarlo un abogado.*
