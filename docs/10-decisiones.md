# 10 · Registro de decisiones (ADR)

Formato: fecha · decisión · motivo · alternativas descartadas · consecuencias. Las nuevas van al final.

## 2026-10-09 · WhatsApp con Evolution API (Baileys), no API oficial de Meta
- **Motivo:** evitar plantillas aprobadas por Meta para seguimientos y simplificar la puesta en marcha.
- **Descartado:** Cloud API oficial (plantillas obligatorias fuera de 24 h; verificación de Meta Business).
- **Consecuencias:** riesgo de bloqueo del número (aceptado por TekFusion y escrito en el acuerdo); reglas anti-bloqueo obligatorias; fallback a Cloud API vía Evolution documentado.

## 2026-10-09 · Bandeja de WhatsApp dentro del CRM, uso desde computador
- **Motivo:** una sola pantalla para el ejecutivo; medición real de tiempos de respuesta; experiencia previa negativa con chats móviles de plataformas.
- **Descartado:** Chatwoot aparte (dos pantallas; sin pipeline); responder desde el celular vía dispositivos vinculados (queda como opción futura).
- **Consecuencias:** el celular solo recibe avisos; no se construye app móvil.

## 2026-10-13 · Modelo comercial
- Desarrollo $1.200.000 + IVA (50/50), **el sistema queda a nombre de TekFusion**; plan de mantención opcional $100.000 + IVA/mes (plataforma + mantención + soporte), 2 primeros meses incluidos desde la entrega; sin permanencia; mejoras se cotizan aparte. Si no toman el plan, asumen plataforma y fallas sin soporte de Libux.
- **Consecuencia técnica:** todas las cuentas a nombre de TekFusion desde el inicio; checklist de traspaso.

## 2026-10-14 · Base del CRM: Atomic CRM (MIT)
- **Motivo:** mismo stack (React + Supabase), licencia MIT que permite rediseñar y entregar como propio, base pequeña y activa.
- **Descartado:** GoHighLevel (WhatsApp oficial, costo mensual alto, no es propiedad del cliente); Twenty (AGPL, permisos por fila de pago); Frappe (AGPL, Python); NocoBase y Evo CRM (licencia/marca impiden entregarlo como propio); EspoCRM/SuiteCRM (obligan a mostrar su marca). Ver informe "CRM open source para TekFusion".
- **Consecuencias:** reemplazar las RLS por defecto de Atomic antes de cargar datos; página Créditos con componentes de terceros.

## 2026-10-14 · Stack definitivo
- Supabase Pro + Edge Functions para el receptor de WhatsApp; n8n en VPS para automatizaciones; Cloudflare Pages para hosting (Vercel Free no permite uso comercial); Claude Haiku para clasificación; Uptime Kuma para monitoreo.
- **Regla:** mensajes de WhatsApp no pasan por n8n para guardarse.

## 2026-10-28 · Correo de ejecutivos por IMAP/SMTP (VíaRed) y Gmail por contraseña de aplicación
- **Motivo:** seguimientos a nombre del ejecutivo y detección de respuestas; Gmail por IMAP evita el vencimiento de OAuth en modo prueba.
- **Pendiente:** confirmar que el plan de VíaRed permite IMAP y que SPF/DKIM están activos.

## 2026-11-01 · Rol de Grok Bot en el proyecto
- Grok Bot no construye el CRM. Se usa solo como herramienta interna de Libux: QA en staging, scribe de decisiones en Notion, redacción del manual, reporte narrativo semanal, borradores. Nunca toca producción, clientes reales ni credenciales. Datos de TekFusion no entran al cerebro de Libux. Clasificación de leads se queda con Haiku vía n8n. Ver `12-equipo-agentes.md`.

## 2026-11-02 · Seguridad ampliada y controles automáticos
- **Motivo:** la base de `08` cubría RLS, secretos y datos, pero no servidor, cuentas, contenido externo, correo ni respaldos fuera del proveedor. Un CRM que muestra correos y WhatsApp de desconocidos necesita sanitización explícita.
- **Decisiones:** 2FA en cuentas y TOTP para gerencia; VPS sin puertos públicos; sanitización de contenido externo; Turnstile; SPF/DKIM/DMARC como requisito previo a seguimientos; respaldos semanales a Cloudflare R2 con prueba de restauración cronometrada; Sentry; plan de incidente; RF-17 (ley 21.719) incluido sin costo.
- **Controles:** hooks de Claude Code (`.claude/hooks/`), lefthook + gitleaks, CI con pgTAP, Dependabot, plantilla de PR. Tareas 🔒 con nombre en `09`.
- **Consecuencias:** +1 día en Fase 1, +0,5 en Fase 3 y Fase 5. Dentro de las 7 semanas.

## 2026-11-02 · Cuentas creadas por Libux mientras TekFusion no entregue accesos
- **Motivo:** no detener la Fase 1 por la tarjeta o el DNS. GitHub, Supabase (free para staging) y Cloudflare se crean en cuenta de Libux y se **transfieren** a TekFusion (GitHub: transferir repo; Supabase: transferir proyecto a su organización; Cloudflare: cambiar de cuenta antes de producción).
- **Regla:** producción jamás se crea en cuenta de Libux. Registrar aquí la fecha de cada transferencia.

## 2026-11-02 · Mejoras propuestas, no comprometidas
- Las 11 mejoras listadas en `02-requisitos-funcionales.md` quedan fuera del alcance hasta que Ignacio decida cuáles entran. No se construyen "porque es fácil".

## 2026-11-03 · Repo creado sobre Atomic CRM y fusión con su tooling
- **Base:** marmelab/atomic-crm @ `251d3cccf4dc35c9f53036057bdf558dc2e108ba` (2 nov 2026), sin su historial. `LICENSE.md` (MIT) se conserva tal cual.
- **Hallazgo:** Atomic ahora trae su propio sistema de agentes para Claude Code (orquestador + 6 agentes, ~30 hooks, reglas y skills), pensado para su devcontainer Linux. Sus reglas exigen inglés en todo archivo commiteado y prohíben correr validaciones a mano.
- **Decisión:** se desactiva la orquestación (movida a `.claude/_atomic-harness/`, no se carga) y se conservan sus skills de código (`backend-dev`, `frontend-dev`, `shadcn-customization`, `update-branding`, `e2e-conventions`, `playwright-testing`, `ponytail*`) y sus hooks útiles (`bash-guard`, `pre-pr-checks`, `format-on-write`, `check-typescript-shortcuts`). Metodología: sigue siendo agent-skills (Addy Osmani).
- **Ajustes:** pre-commit con husky + lint-staged de Atomic (no lefthook) + gitleaks; `make` reemplazado por scripts npm (Windows); CI = `check.yml` de Atomic + `seguridad.yml` nuestro (gitleaks, pgTAP, npm audit); se retiran `deploy.yml` (doc de Atomic en GH Pages) y `claude.yml` (bot @claude) — guardados en `docs/atomic/`.
- **Modelo de datos:** reutilizar tablas de Atomic (`deals`=lead, `sales`=ejecutivo, `contacts`, `companies`) y nombres nuevos en inglés; esquema declarativo en `supabase/schemas/`. Mapeo en `05-modelo-datos.md`. Se confirma en Fase 2.
- **Idioma:** código en inglés; interfaz en español vía i18n (Atomic trae inglés y francés con `ra-i18n-polyglot`; agregar mensajes `es` en Fase 3); docs y commits en español.
- **Entorno:** Windows nativo en `D:\Tekfusion\tekfusion-crm`. Plan B si algún hook o script falla en Windows: el `.devcontainer/` de Atomic o WSL2.
- **Node:** 24 (`.nvmrc` de Atomic), no 20.

## 2026-11-03 · Sesiones nocturnas como loop por tareas
- **Motivo:** un solo `claude -p` con toda la lista se traba a la mitad y se pierde el resto; además el contexto se degrada. El patrón probado en la comunidad ("Ralph loop") es una corrida por tarea con contexto limpio, estado en disco y verificación fuera del agente.
- **Decisión:** `scripts/tekfusion/nocturno.mjs` (Node, Windows y Mac): cola JSON por noche, una corrida de `claude -p --output-format json` por tarea con `--max-turns`, `--max-budget-usd`, `--permission-prompts none` y herramientas acotadas; verificación la corre el script; commit si pasa, `reset --hard` + reintento con el error si falla; `BLOQUEADA:` para decisiones; dependencias entre tareas; reporte y `session_id` para retomar. Comandos `/nocturno` (arma la cola desde `docs/09`) y `/manana` (revisión).
- **Descartado:** plugin `ralph-loop` oficial (menos control sobre verificación y reporte) y `--dangerously-skip-permissions` (en un PC real, no).
- **Probado:** con un `claude` simulado, los casos hecha / falla+reintento / bloqueada / dependencia caída / Supabase apagado / Claude que no arranca.

## 2026-11-03 · Decisiones de las colas nocturnas (T2, T3, T5, T7, T8)
- **Motivo:** de noche, Claude tomó decisiones que no estaban registradas; Ignacio las revisó en la mañana.
- **T7/T8 · zod:** `supabase/functions/_shared/leadClassification.ts` y `evolutionWebhook.ts` quedaron con validación manual porque el proyecto vitest `functions` no tiene alias para `npm:zod`. **Decisión:** se migran a zod hoy (alias de `npm:zod` en `vitest.config.ts`), como pide CLAUDE.md §4 y la tarea de la Fase 4.
- **T2 · DealsChart:** la barra "pendiente" pondera los leads abiertos con la rampa heredada de Atomic (nuevo 0,2 / contactado 0,5 / cotizado 0,8) y la barra "perdido" suma `perdido` + `archivado`. **Decisión:** queda así hasta que TekFusion defina el criterio; la pregunta está en `11-pendientes-kickoff.md` (Reglas).
- **T3 · Idioma:** el español como idioma por defecto se adelanta a la Fase 1 (la decisión anterior lo ubicaba en Fase 3) y **queda**. *Corrección del mismo día:* T3 había cambiado `src/lib/i18nProvider.ts`, que el CRM no usa (`<CRM>` trae su propio proveedor en `providers/commons/i18nProvider.ts`), así que la interfaz seguía en inglés. Ahora ese proveedor tiene catálogo `es` (claves `ra.*` y `crm.*`/`resources.*` en `src/lib/i18n/es.ts`, tipadas contra `englishCrmMessages`) y el CRM parte en español sin importar el idioma del navegador (se quitó `getInitialLocale`); inglés y francés quedan en el menú. Lo que no tenga traducción cae a inglés. Las claves nuevas se agregan en inglés y francés también, porque el catálogo francés está tipado como completo.
- **T5 · Seed:** mientras `sales` no tenga `role`, "lector" y "ejecutivo" solo se distinguen por `administrator=false`; se resuelve con la RLS de la Fase 2. Contraseña local de los 4 usuarios ficticios: `demo-tekfusion` (solo local/staging). El trigger `20_contact_saved` (Gravatar por HTTP) se desactiva durante la carga para no llamar a servicios externos.
- **Gitleaks:** el dato de prueba `secreto-de-prueba-123` del test del webhook (T8) es un falso positivo de la regla `generic-api-key`. Se marca con `gitleaks:allow` en la línea y su huella histórica (commit 986ba13) se registra en `.gitleaksignore`.
- **Tests del harness:** el proyecto vitest `claude` (tests de los hooks del harness de Atomic) fallaba entero, también en `main`, porque prueba un sistema que está desactivado. **Decisión:** los tests del harness quedan fuera junto con el harness: se quita el proyecto `claude` de `vitest.config.ts` y el script `test:unit:claude`. `test:unit:app` corre solo `app` y `functions`. Si algún día se reactiva el harness, se reactivan sus tests.

## 2026-11-03 · Menú móvil igual al de escritorio
- **Decisión:** la barra inferior móvil tiene los mismos 7 ítems y el mismo orden que el header (Pipeline, Leads, Contactos, Empresas, WhatsApp, Dashboard, Configuración), con scroll horizontal en vez de esconder ítems; el botón "+" (crear contacto, nota o tarea) queda al final.
- **Regla dura 9:** no se construyen flujos móviles: en pantalla chica se reutilizan las pantallas de escritorio (kanban, lista de leads, lista de empresas, WhatsApp).
- **Consecuencias:** "Tareas" ya no está en la barra móvil (no está en el menú de escritorio); la ruta `/tasks` sigue existiendo en móvil.

## 2026-11-03 · Fase 2: modelo de datos y RLS (propuesta aprobada)
- **Fuente:** `docs/fase-2-propuesta.md`, aprobada por Ignacio con las 5 recomendaciones.
- **1 · Ids `bigint`:** las tablas nuevas usan `bigint generated by default as identity`, como Atomic; no `uuid` como decía `05`. Descartado `uuid`: claves foráneas heterogéneas y cambios en el data provider sin ganar seguridad (la protege la RLS).
- **2 · `sales.role` es la fuente de verdad del rol** (`manager` / `executive` / `reader`); `sales.administrator` se mantiene y un trigger lo sincroniza (`administrator = (role = 'manager')`) para que las pantallas de Atomic sigan reconociendo a gerencia. Solo gerencia cambia `role`, `administrator` y `disabled`.
- **3 · Borrado:** solo gerencia y **solo en `contacts` y `companies`** (lo necesita `merge_contacts` y la importación). `deals`, `wa_messages`, `wa_conversations` y `quotes` **nunca se borran**: no tienen policy de delete; se anonimizan (RF-17).
- **4 · "Tomar" un lead:** un ejecutivo puede tomar un lead sin asignar mediante la RPC `take_deal(deal_id)`; queda registrado y avisa a gerencia. Reasignar leads ya asignados sigue siendo solo de gerencia.
- **5 · Empresas visibles para todo usuario interno** (lectura); escritura gerencia y ejecutivos; borrado solo gerencia. Los datos personales viven en `contacts`, que sí queda restringido.
- **Consecuencias:** las policies `using (true)` de Atomic se eliminan de `05_policies.sql` (no se apilan). Valores de enum en español, iguales a los de la interfaz. "Ganado exige monto" y "perdido exige motivo" se agregan en Fase 3 con su pantalla.

## 2026-11-03 · Endurecimiento tras la revisión de la Fase 2 (security-reviewer + database-reviewer)
- **Motivo:** los dos agentes de ECC revisaron `main..fase-2/datos` con el encargo de Ignacio. Los 6 puntos pedidos salieron OK; lo que sigue son sus hallazgos, todos corregidos con test pgTAP (`supabase/tests/15_rls_endurecimiento.test.sql` y nuevas aserciones en `14_rls_cobertura`).
- **Alto (database-reviewer):** un ejecutivo podía traerse un contacto ajeno agregándolo a `contact_ids` de su propio lead y desde ahí leerlo y editarlo. Trigger `guard_deal_contact_ids`: un ejecutivo solo enlaza contactos propios o sin dueño; `protect_contact_owner`: no crea contactos a nombre de otro ni los reasigna (solo gerencia).
- **Medio (security-reviewer):** un usuario desactivado con JWT vigente podía quitarse su propio ban por la Edge Function `users`; además `disabled ?? false` reactivaba a quien se editara sin ese campo. La función rechaza usuarios desactivados y solo cambia el ban cuando un administrador lo manda explícitamente (`_shared/activeSale.ts`, con test).
- **Grants:** `anon` queda solo con `select` sobre `init_state` (login); `authenticated` sin `TRUNCATE/REFERENCES/TRIGGER`; en `sales` solo escribe por PostgREST las columnas de perfil más las tres que protege el trigger (`email`, `user_id`, `secondary_emails` quedan fuera); las funciones nuevas no son ejecutables por `anon`/PUBLIC; privilegios por defecto de `postgres` en `public` sin `anon`. Todo en `12_tekfusion_grants.sql`.
- **Otros:** siempre queda al menos un manager activo (trigger `ensure_active_manager`); `take_deal` excluye leads archivados; la puerta de los triggers de guarda es el rol de conexión, no `auth.uid()`; las policies de Storage exigen usuario interno (el bucket sigue público hasta las URLs firmadas de la Fase 3); `activity_log` ya no expone `raw_source`; las policies usan `contact_ids @> array[id]` (usa el índice GIN) y llaman los helpers como `(select fn())` para evaluarlos una vez por consulta; FKs con `on delete` explícito e índices para las policies.
- **No se hizo (fuera de alcance):** bucket privado con URLs firmadas (Fase 3); `enable_signup = false` en producción se decide al crear el proyecto; interfaz para el rol lector (ítem "Auth: roles" de la Fase 2).

## 2026-11-03 · Configuración → Usuarios: rol, línea, suplente y ausencias
- **Decisión:** la tabla de Usuarios (`/sales`, enlazada desde Configuración) muestra nombre, correo, rol, línea a cargo, suplente y ausencias; se edita en la ficha del usuario, que solo ve gerencia (`canAccess` de `sales`, más la RLS).
- **Rol:** el formulario manda `role` a la Edge Function `users` (validado contra el enum en `users/role.ts`), que escribe `sales.role`; el trigger `sync_sales_role` ajusta `administrator`. Se quitó el interruptor "Administrador" de Atomic. Un cliente que solo manda `administrator` sigue funcionando.
- **Suplente:** vive en `business_lines` (uno por línea, `docs/05`). En la ficha del usuario se edita uno solo y se aplica a todas sus líneas (RF: "cada ejecutivo tiene un suplente"). Marcar una línea la quita a su dueño anterior; desmarcarla la deja sin dueño. El suplente no puede ser el mismo usuario ni un lector.
- **Ausencias:** `sales_absences`, editadas como lista de rangos (desde, hasta, motivo); se guardan por diferencia (crear, actualizar, borrar) después de actualizar al usuario. No es atómico: si falla una escritura, lo anterior queda guardado y se avisa el error.
- **Descartado:** una pantalla aparte de líneas de negocio (llega con el resto de Configuración en la Fase 3); RPC transaccional para guardar todo junto (pocas filas, un solo editor: gerencia).
- **Consecuencias:** el proveedor de Supabase declara `business_lines` con llave `code`; FakeRest usa `id = code`.

## 2026-11-03 · El lector no ve acciones de escritura
- **Decisión:** `canAccess` (`providers/commons/canAccess.ts`) da al rol `reader` solo `list`, `show` y `export`. El rol sale de `sales.role` (`getAccessRole`, ambos authProvider). La RLS sigue siendo la barrera real; esto evita que la interfaz ofrezca lo que la base va a rechazar.
- **Dónde:** los botones base de shadcn-admin-kit (`CreateButton`, `EditButton`, `DeleteButton`, `BulkDeleteButton`) consultan `useCanAccess` y no se dibujan sin permiso, así toda pantalla nueva queda cubierta. Los controles propios de Atomic usan `<CanAccess>`/`useCanAccess`: importar CSV/JSON, archivar, notas, etiquetas, tareas, fusionar contactos, crear desde el panel de empresa, contactos calientes y menú móvil; el kanban no deja arrastrar.
- **"Tomar":** todavía no hay botón en la interfaz (la RPC `take_deal` existe). Cuando se construya (leads sin asignar, Fase 3; bandeja, Fase 4) debe ir dentro de `<CanAccess resource="deals" action="edit">`.
- **Descartado:** un `<CanWrite>` propio: `<CanAccess>` de ra-core ya lo hace.

## 2026-11-03 · Importador CSV de leads (RF-15)
- **Decisiones de negocio (Ignacio, 2026-11-03):** una fila cuyo contacto (mismo correo o teléfono, `docs/03`) ya tiene un lead activo **se omite y se reporta** como duplicada, sin tocar el lead existente. Si la columna de ejecutivo viene vacía, el lead va al **dueño de la línea**; sin línea o sin dueño, queda sin asignar. Un correo de ejecutivo que no corresponde a un usuario activo es error.
- **Técnicas:** se extiende el importador de deals de Atomic (`dataImport/useDealImport.ts`); columnas en inglés como los otros importadores de Atomic (`deals_sample.csv`, descargable desde el mismo diálogo): `name, company, contact_first_name, contact_last_name, email, phone, business_line, stage, sales_email, amount, expected_closing_date, description`. Línea y etapa aceptan valor o etiqueta ("tuberias" o "Tuberías"). Un valor dado pero no entendido es error (antes la etapa desconocida caía en "nuevo" en silencio); una celda vacía usa el valor por defecto. Teléfonos en E.164 (`tekfusion/phone.ts`, reglas chilenas). Si el contacto solo tiene leads cerrados, el nuevo lead se enlaza con `previous_deal_id` ("cliente recurrente"). Todo lead importado queda `origin_channel = migracion`.
- **Reporte:** al terminar, un diálogo con creados, duplicados y errores, y el detalle por línea del CSV (línea, tipo, motivo). El lote puede devolver un reporte además de la cuenta (`ImportBatchReport`); contactos y empresas siguen igual.
- **Deduplicación:** el índice (contactos, leads, usuarios, dueños de línea) se carga una vez por importación y se actualiza con cada fila creada, así también detecta un contacto repetido dentro del mismo CSV. Las filas se escriben de a una.
- **RF-15 se cumple con plantilla fija (Ignacio, 2026-11-03):** no hay pantalla de mapeo de columnas; Libux adapta el CSV del Sheets a la plantilla `deals_sample.csv` antes de importar.
- **Descartado:** mapeo de columnas en pantalla; tabla `importaciones` de `docs/05` (el reporte se muestra, no se guarda); agregar una nota al lead activo en vez de omitir (opción descartada por Ignacio).
- **Sin asignar en la base:** el trigger de Atomic `set_sales_id_default` ponía como dueño a quien insertaba un lead sin `sales_id`, así que en Supabase la fila sin ejecutivo ni dueño de línea quedaba a nombre de gerencia. Ahora `set_deal_sales_id_trigger` (movido a `11_tekfusion_policies.sql`, migración `leads_sin_asignar_gerencia`) no corre cuando inserta gerencia; un ejecutivo sigue quedando como dueño y el service role deja el lead sin asignar. `DealCreate` siempre manda `sales_id`, así que el alta manual no cambia. Test pgTAP `16_deals_sin_asignar`.
- **Arreglo de paso:** el filtro `@in` del adaptador FakeRest rechazaba nombres entre comillas con puntos ("S.A.", "Ltda."): la importación entera fallaba en modo demo. Ahora acepta cualquier carácter salvo la comilla, como PostgREST.

## 2026-11-03 · Aviso "Cannot update a component while rendering" en los filtros
- **Causa:** `useFormField` (`src/components/admin/form.tsx`, dependencia mutable de shadcn-admin-kit) leía todo el estado del campo con `getFieldState(name, formState)`. Leer `validatingFields` del proxy hace que react-hook-form 7.90 lo rastree en el formulario raíz; entonces un input que se registra después de montado el formulario (el filtro de ejecutivo del kanban aparece cuando se resuelve el permiso) dispara `_setValid → _updateIsValidating`, que notifica en sincronía al `FilterLiveForm` mientras se renderiza el input. Pasaba también en Contactos. No era de la RLS ni del rol de Andrea.
- **Arreglo:** los componentes de campo solo muestran el error, así que `useFormField` se suscribe únicamente a `errors` del campo (`useFormState({ name })`). Test de regresión: `misc/FilterRenderWarning.test.tsx` (falla sin el arreglo).
- **Descartado:** parchar ra-core o react-hook-form en `node_modules`; copiar `FilterLiveForm` para no leer `isValid`.

## 2026-11-03 · "Dar de baja usuario" (checklist de docs/08)
- **Decisión:** la baja es una RPC transaccional `offboard_sale(sale_id)` (`11_tekfusion_policies.sql`, security definer, solo gerencia vía `auth.role()` + `is_manager()`, nunca sobre uno mismo): desactiva la fila de `sales`, reasigna los leads abiertos (`nuevo`/`contactado`/`cotizado`, no archivados) al suplente de sus líneas, le traspasa las líneas que tenía a cargo y lo quita como suplente, borra sus sesiones (`auth.sessions`, cascada a refresh tokens) y escribe en `audit_log`. La Edge Function `users` (método `DELETE`) banea primero en Auth y luego llama la RPC con service role; si la RPC rechaza, levanta el ban. Los leads cerrados conservan al dueño (métricas).
- **Sin suplente** (o suplente desactivado/lector): los leads quedan sin asignar y las líneas sin dueño.
- **Registro:** tabla nueva `audit_log` (`actor_sales_id`, `action`, `target_sales_id`, `deal_id`, `details`): es la "actividades" de eventos de sistema que `docs/05` llamaba `deal_events`, generalizada para que sirva también a eventos de usuario. Lee gerencia; escribe solo el sistema (RPC, service role). Las filas con `deal_id` (`deal.reassigned`) alimentan la línea de tiempo del lead en la Fase 3.
- **Interfaz:** botón "Dar de baja" en la ficha del usuario (Configuración → Usuarios) con confirmación; el interruptor "Desactivado" de Atomic solo aparece para **reactivar**, así la desactivación siempre pasa por el checklist.
- **Pendiente de otras fases:** rotar clave SMTP/IMAP (Fase 5, cuando exista `sales_mail_accounts`) y reasignar conversaciones de WhatsApp (Fase 4, tabla `wa_conversations`): agregar ambos pasos a `offboard_sale` en su fase.
- **Aprendizaje:** dentro de una función `security definer`, `current_user` es el dueño (postgres): para distinguir sesión de API de backend hay que usar `auth.role()` (claim del JWT).

## 2026-11-03 · Adjuntos privados: bucket cerrado y URLs firmadas
- **Decisión:** el bucket `attachments` deja de ser público (migración `adjuntos_privados`, escrita a mano porque `db diff` ignora las filas de `storage.buckets`). Lo que se guarda en la base sigue siendo la URL pública (referencia estable, y la función `delete_note_attachments` la entiende); al **leer**, el data provider de Supabase la cambia por una URL firmada de 60 minutos (`providers/supabase/signedUrls.ts`, hook `afterRead` de notas, empresas, contactos, usuarios; `activity_log` y los logos de configuración a mano). Las firmas se recuerdan en memoria hasta 5 minutos antes de vencer.
- **Policy:** `can_read_attachment(name)` (security invoker: sus subconsultas pasan por la RLS de quien llama). Cada archivo vive bajo la carpeta de su dueño, que `uploadToBucket` fija al subir: `deals/<id>/…` exige ver el lead, `contacts/<id>/…` ver el contacto, `companies/`, `sales/`, `config/` cualquier usuario interno, y lo que Atomic dejó en la raíz solo gerencia. Subir: gerencia y ejecutivos, solo bajo una carpeta conocida. Test pgTAP `18_storage_adjuntos`; verificado en pantalla como Andrea (`docs/capturas/adjunto-firmado.png`): la imagen carga por `/object/sign/` y la URL pública responde 400.
- **Límite conocido:** react-query persiste su caché 24 h en localStorage; tras una hora la URL guardada vence y el adjunto no abre hasta que la vista vuelve a pedir los datos (al montarse). Si molesta, bajar `gcTime` de las notas o firmar al hacer clic.
- **Descartado:** firmar al subir y guardar la URL firmada (vence); un bucket aparte por tipo (los archivos de Atomic ya están todos en `attachments`); mover a Storage los avatares de contactos (vienen de Gravatar, URL externa, no se tocan).
- **Aprendizaje:** en un script de Node, `String.replace` con reemplazo de texto convierte `$$` en `$` (rompe los cuerpos de funciones SQL); pasar una función como reemplazo.

## 2026-11-03 · Verificación en dos pasos (TOTP)
- **Decisión:** Supabase Auth MFA con TOTP (`config.toml`: `[auth.mfa.totp] enroll_enabled/verify_enabled`). Enrolamiento con QR y clave manual en Configuración → Mi perfil (`mfa/MfaSection`) y, para gerencia, forzado antes de entrar (`/mfa/enroll`); verificación del código al iniciar sesión (`/mfa/verify`). La puerta es `MfaGate`, en los dos layouts: lee el nivel de la sesión (`getAuthenticatorAssuranceLevel`, sin red) y el rol cacheado; un ejecutivo o lector con factor también debe verificar; sin factor, solo gerencia es enviada a enrolar. Gerencia no puede desactivarlo; el resto sí.
- **Pruebas:** doble en memoria de `auth.mfa` (`src/test/fakeMfaApi.ts`) inyectado por el `authProvider` (`getMfaApi`); tests `mfa/Mfa.test.tsx`. Manual con Andrea en local: `docs/capturas/mfa-enrolar.png`, `mfa-verificar.png` (la clave de la captura es de un factor local de prueba que `db reset` borra).
- **Límite conocido (pendiente):** la obligación vive en el frontend. Un JWT de gerencia en `aal1` (sin verificar) sigue siendo válido contra PostgREST. Para cerrarlo hace falta exigir `auth.jwt()->>'aal' = 'aal2'` a los managers en `current_user_role()` (o una policy aparte), cuidando que el enrolamiento no necesite la base. Se propone en la revisión de seguridad; no se hizo en esta tarea.
- **Descartado:** interceptar en `checkAuth` del authProvider (ra-core cierra la sesión cuando `checkAuth` lanza); WebAuthn/SMS (Evolution no es canal de OTP y el alcance dice TOTP).

## 2026-11-03 · Revisión de seguridad de fase-2/seguridad (security-reviewer de ECC)
- **Motivo:** el agente revisó `main..fase-2/seguridad`: 1 hallazgo alto, 6 medios, 10 bajos. Todos corregidos en la migración `revision_seguridad` y en el código, salvo lo anotado como pendiente. Tests nuevos: pgTAP `19_mfa_aal`; 17 y 18 ajustados.
- **Alto · TOTP exigido en la base:** `current_sales_id()` y `current_user_role()` devuelven null si la sesión no está en `aal2` y el usuario es gerencia o tiene un factor verificado (`auth.mfa_factors`). Un gerente sin factor no ve datos hasta enrolarse; enrolar y verificar van contra Auth, no contra las tablas. La propia fila de `sales` (no desactivada) y `configuration` se leen igual en `aal1`, para que la app sepa el rol y pinte la marca. La Edge Function `users` también exige `aal2` (claim del JWT) a gerencia y a quien tenga factor. Todos los tests pgTAP se loguean con `aal2`.
- **Medios:** `offboard_sale(sale_id, actor_id)` solo para `service_role` (la Edge pasa el gerente como actor: antes quedaba `actor_sales_id = null`); `pg_advisory_xact_lock` en `offboard_sale` y en `ensure_active_manager` (dos bajas cruzadas no dejan el sistema sin gerencia); la Edge no levanta el ban si la RPC dice "ya desactivado" y no devuelve mensajes SQL; subir y borrar en Storage pasan por `can_write_attachment` (el lead o contacto debe ser editable por quien escribe); guarda de largo (≤ 15 dígitos) antes del cast a `bigint` en las rutas de adjuntos; las queries de MFA no se persisten en localStorage (`meta.persist = false`: el secreto TOTP del enrolamiento no toca el disco); al guardar un registro ya leído se vuelve a escribir la URL pública estable, nunca la firmada.
- **Bajos:** el cache de firmas se borra al cerrar sesión; `audit_log.deal_id` ya no borra en cascada; `revoke … from anon` explícito en la migración; `disabled` sale de las columnas que `authenticated` actualiza (desactivar y reactivar solo por la Edge, que ahora registra `sale.reactivated`); `sales_id` validado y errores fijos en la Edge; `getMfaRequirement` falla cerrado; captura `mfa-enrolar.png` con clave y QR tapados; `max_enrolled_factors = 3`.
- **Pendiente (no es de esta rama):** `[auth.rate_limit]` de MFA en el panel de la nube; zod en la Edge `users` (Fase 4 lo exige para webhooks); limpiar la caché persistida de react-query al cerrar sesión (viene de Atomic); `offboard_sale` usa un solo suplente para todas las líneas y no reasigna contactos ni tareas; un gerente puede dar de baja a otro gerente (queda en `audit_log`; si TekFusion quiere más, se pide confirmación aparte).

## 2026-11-03 · Esquema de la Fase 3: cotizaciones, seguimientos, plantillas, alertas, respuestas rápidas
- **Decisión:** tablas `quotes`, `followups`, `templates`, `alerts`, `quick_replies` agregadas a `10_`/`11_`/`12_` (más el bucket `quotes` en `07_`), migración `20261103220000_fase3_cotizaciones_seguimientos_alertas` escrita a mano. Ids `bigint` y enums en español como en la Fase 2: `send_channel`, `delivery_status` (compartido con `wa_messages` de la Fase 4), `followup_mode`, `followup_status`, `alert_type`.
- **Cotizaciones:** versión por lead (`unique (deal_id, version)`), una sola vigente (índice único parcial), `sales_id` = autor (trigger de Atomic `set_sales_id_default`; un ejecutivo no firma por otro). El PDF va al bucket privado `quotes` (solo `application/pdf`, 15 MB, nativo de Storage) en `deals/<deal_id>/<uuid>.pdf`: un `check` en la tabla y la policy de subida exigen nombre regenerado y la carpeta del propio lead; lectura con `can_read_attachment`. Sin delete (ni policy ni grant), ni en tabla ni en Storage. `delivery_status` lo escribirá el envío (Edge/webhook).
- **Seguimientos:** al menos un canal; `enviado` exige `sent_at`; `cancel_reason` solo si `cancelado`; `job_id` único (idempotencia de n8n). Cancelar es update.
- **Alertas:** las crea el sistema (sin grant de insert para `authenticated`); el destinatario solo puede escribir `read_at` (grant por columna); gerencia las ve todas pero no las marca por otros. Índice único parcial `(type, deal_id, recipient_sales_id) nulls not distinct where read_at is null`: la misma alerta abierta no se repite, tampoco las sin lead.
- **Plantillas:** un `check` rechaza cualquier `{{…}}` que no sea `nombre`, `empresa`, `producto` o `ejecutivo`; asunto solo en las de correo. Plantillas y respuestas rápidas: todos leen, gerencia escribe.
- **Descartado:** guardar el PDF en `attachments` (docs/05 pide bucket propio y así se limita a PDF); `delivered_at`/`read_at` en cotizaciones (basta el estado); calcular la versión con trigger (la pantalla la propone, el `unique` la protege); restringir por columna el update de cotizaciones y seguimientos (ra-core manda el registro completo).
- **Revisión (database-reviewer de ECC, mismo día):** sin hallazgos críticos ni altos. Corregidos: `can_edit_deal` exige rol ejecutivo (un lector que quedara dueño de un lead podía escribir sus cotizaciones, seguimientos, notas y adjuntos); una alerta leída no se reabre (`with check (read_at is not null)`); trigger `guard_deal_child`: un ejecutivo no mueve cotizaciones ni seguimientos a otro lead ni cambia autor o versión de una cotización; regex de UUID estricta y id de lead sin ceros a la izquierda en la ruta del PDF. Tests nuevos en 20, 21 y 22.
- **`deals_update`** exige gerencia o ejecutivo (migración `deals_update_solo_ejecutivo`, test en 10): un lector nunca edita un lead aunque figure como dueño.
- **Pendiente anotado:** PDFs huérfanos si falla el insert de la cotización tras subir el archivo (limpieza con service role cuando exista el envío); sin `unique (deal_id, step)` en seguimientos porque una cotización nueva regenera los pasos.
- **Aprendizaje:** `db diff` comió el `$'` de una regex dentro de una policy de Storage (mismo bug de `String.replace`); y una migración nueva debe llevar timestamp posterior a la última (`revision_seguridad` es 21:00 aunque se generó antes): si no, corre antes de las funciones que usa.

## 2026-11-03 · Ficha del lead: base de datos
- **Línea de tiempo:** los cambios de etapa y de ejecutivo hechos por usuarios se registran en `audit_log` (trigger `log_deal_changes`, `deal.stage_changed` / `deal.reassigned`); una policy nueva deja leer las filas con `deal_id` a quien ve el lead. Las acciones del sistema (service role, n8n, `offboard_sale`) escriben su propio registro.
- **Enviar cotización:** RPC `send_quote(quote_id, channels)` (security definer, valida gerencia o dueño del lead): una fila por canal en `send_queue` (la consume n8n en la Fase 5; nadie la escribe a mano), lead a `cotizado` con el monto de la cotización, cancela los seguimientos pendientes o vencidos y programa la cadencia `configuration.config.followupCadenceDays` (por defecto `[2, 5, 10]`) a las 10:00 de Santiago, corrida al lunes si cae en fin de semana, con los mismos canales y la plantilla activa del primer canal (rotando por paso). Si el lead tiene `followups_enabled = false`, no programa.
- **Versiones:** trigger `set_quote_version`: una cotización nueva toma la versión siguiente y deja la vigente en el historial (`is_current = false`).
- **Ganado/perdido:** trigger `guard_deal_closing` en la transición de etapa (no `check`): los leads históricos que importa la migración (RF-15) pueden venir cerrados sin monto o motivo.
- **Descartado:** encolar desde el frontend con varios inserts (no atómico; la cola quedaría escribible por los usuarios).

## 2026-11-03 · Ficha del lead: pantalla
- **Decisión:** la ficha sigue siendo el diálogo de Atomic (`DealShow`, ahora `lg:max-w-6xl`), con dos columnas: "Datos del lead" (`LeadDataBlock`) y "Línea de tiempo" (`LeadTimeline`, caja de nota arriba). Orden: lo más reciente arriba, como las notas de Atomic. Los seguimientos pendientes no van a la línea de tiempo (viven en el programador).
- **Editable en línea:** `InlineEditField` abre un `Form` de ra-core con un solo input de `components/admin` y guarda solo esa columna (línea, canal de origen, contacto, empresa). El ejecutivo no se edita en línea: lo cambia "Reasignar", solo gerencia, sin lectores en la lista.
- **Acciones:** todas dentro de `CanAccess action="edit"` (el lector no ve ninguna); "Tomar" llama `take_deal` (método `takeDeal` del data provider).
- **Textos:** las pantallas nuevas de TekFusion usan el catálogo `tekfusion.*` (`src/lib/i18n/es/tekfusion.ts`), solo en español, mezclado en los tres idiomas; las claves de Atomic siguen con sus traducciones. Evita mantener inglés y francés de pantallas que solo se usan en español.

## 2026-11-03 · Cotización, cierre y seguimientos (pantallas)
- **Cotización:** módulo `quotes/`: `SendQuoteButton` sube el PDF (`uploadQuotePdf`), crea la versión y llama `send_quote`; `QuoteHistory` lista las versiones y abre el PDF con URL firmada al hacer clic. Validación de los formularios a nivel de formulario cuando hay un `ReferenceInput` (un validador de campo dentro de él puede registrarse tarde y dejar pasar un envío).
- **Ganado/perdido:** `CloseDealDialog` + `useCloseDeal`, usados por la ficha (botones "Ganado"/"Perdido") y por el kanban: soltar una tarjeta en esas columnas abre el diálogo y la tarjeta solo se mueve al confirmar. El formulario de edición ya no ofrece esas dos etapas salvo que el lead esté en ellas. La nota del perdido es una nota del lead.
- **Seguimientos:** módulo `followups/`: `FollowupScheduler` (próximo, resto e historial) y `FollowupDialog` (programar/ajustar). Ajustar uno vencido lo devuelve a `pendiente`. Vista previa con `renderTemplate`: `{{nombre}}` = primer contacto, `{{empresa}}`, `{{producto}}` = nombre del lead, `{{ejecutivo}}` = firma del ejecutivo (o su nombre); un valor faltante queda visible como `{{…}}`. Fechas mostradas en `America/Santiago`.
- **Arreglo en shadcn-admin-kit:** `SelectInput` no mostraba el mensaje de error en su rama principal (solo en la de carga): se agregó `<FormError />`.
- **Kanban:** cada columna es una `section` con `aria-label` (accesible y localizable en tests).

## 2026-11-03 · Pipeline: filtros y export CSV solo gerencia
- **Decisión:** el export CSV es solo de gerencia en todo recurso, según `docs/08-seguridad-roles.md`: `canAccess` niega `export` a ejecutivo y lector (`READ_ACTIONS` queda en `list`/`show`). Reemplaza lo decidido en la Fase 2, que dejaba exportar al lector. En el pipeline (kanban y tabla `/leads`) el botón Exportar va dentro de `CanAccess action="export"`.
- **Filtros (RF-04):** `deals/DealFilters.tsx`, siempre visibles y aplicados al instante: línea de negocio, canal de origen, rango de fecha de creación (`created_at@gte`/`@lte`, límites del día en UTC) y, solo en la tabla, etapa (en el kanban las columnas ya son etapas). El de ejecutivo es el de Atomic (`AccountManagerInput` para gerencia, `OnlyMineInput` para el resto), ahora también en la tabla.
- **Búsqueda global:** sin cambios: encuentra el lead por su nombre (con la empresa como subtítulo) y abre la ficha; el nombre de la empresa encuentra la empresa, no sus leads (`global_search` busca en los campos propios de cada registro).
- **Pendiente (cola siguiente):** registrar cada export con su autor en `audit_log`.
- **Consecuencias:** el `ExportButton` de shadcn-admin-kit no consulta `canAccess`: en contactos y empresas todavía se ve para el ejecutivo (la regla de `canAccess` ya lo niega, falta envolver esos botones).

## 2026-11-04 · Dashboard de gerencia (decisiones implícitas de la cola nocturna 2026-11-04-b, anotadas en la revisión de la mañana)
- **Filtro (decisión de Ignacio, 2026-11-05):** rango libre **por días** con atajos (Este mes, Mes pasado, Últimos 30 días, Últimos 90 días, Este año); por defecto **Últimos 30 días**, comparado con el período anterior de igual largo. La cola nocturna lo había hecho por meses (las métricas salían de `dashboard_monthly`, agregada por mes); se corrige en `fase-3/ajustes`.
- **Ranking privado en la vista:** `sales_ranking` filtra con `where (select public.is_manager())` dentro de la vista (`security_invoker`): ejecutivo y lector reciben 0 filas sin policy nueva. La interfaz además oculta la sección con `canAccess`.
- **Ubicación:** el bloque "Métricas comerciales" va arriba del dashboard de Atomic (contactos calientes, ingresos proyectados, última actividad, próximas tareas), que se mantiene. Ejecutivos y lectores ven las métricas sin ranking (RF-11).

## 2026-11-05 · Seguimiento con texto por canal (fase-3/ajustes)
- **Decisión:** `followups.messages jsonb` guarda, por cada canal marcado, la plantilla elegida y el texto final que dejó el ejecutivo: `{"correo": {"template_id", "subject", "body"}, "whatsapp": {"template_id", "body"}}`. Restricción `followups_messages_channels`: objeto con solo esas dos claves. `template_id` se mantiene (la cadencia de `send_quote` lo usa) y en un seguimiento manual queda con la plantilla del primer canal.
- **Contrato con n8n (Fase 5):** si `messages.<canal>.body` existe, se envía tal cual (ya viene con las variables resueltas y es texto plano); si no, se renderiza `template_id` como hasta ahora.
- **Interfaz:** un bloque por canal marcado con su selector de plantillas filtrado por canal; elegir plantilla rellena el texto, que es editable. Uno automático exige texto (y asunto en correo); un recordatorio no. Fecha por defecto: próximo día hábil (`businessHours.days`) a las 10:00 de Santiago (`tekfusion/santiago.ts`). Sin "Paso N" al programar a mano.
- **Descartado:** columnas sueltas por canal (cinco columnas nuevas, la mitad nulas) y una tabla hija (más joins para algo que se lee siempre junto).

## 2026-11-05 · Configuración: una sola forma de guardar y sin restos de Atomic (fase-3/ajustes)
- **Guardado único:** plantillas, respuestas rápidas y motivos de pérdida se editan en el formulario de la página (`settings/stagedCatalogs.ts`): "Aplicar" deja el cambio en la lista y el botón fijo "Guardar" escribe primero los catálogos (crea los nuevos, actualiza solo los que cambiaron, los motivos toman su posición del orden) y después `configuration`. Si un catálogo falla, la configuración no se guarda. Excepción: Etiquetas (de Atomic) sigue con su modal propio; se crean desde los contactos.
- **Restos de Atomic:** fuera las categorías de lead (TekFusion clasifica por línea; vacías ocultan el campo, el filtro y el bloque) y los chips "Etapas del pipeline"; sectores y tipos de tarea propios de TekFusion, por confirmar (`docs/11`); el seed usa los mismos valores (`mineria`, `construccion`, `agua`, `agro`, tarea `visit`).
- **Select obligatorio sin ✕:** `SelectInput` (shadcn-admin-kit) ya no ofrece vaciar un campo requerido; vale para todos los selects.
- **Móvil:** la página de Configuración de escritorio se incrusta en la de móvil para gerencia (regla 9: se reutiliza la pantalla, sin flujo propio), con la barra de guardar en el flujo.
- **Pendiente de revisar:** las etapas siguen editables en Configuración aunque el código las trata como constantes (`tekfusion/estados.ts`); renombrarlas o borrarlas rompería reglas. Proponer dejarlas de solo lectura.

## 2026-11-05 · offboard_sale por línea: detalles de implementación (fase-3/ajustes)
- **Reglas:** las de Ignacio del 2026-11-03 (leads por línea, contactos por mayoría con empate al menor id, tareas pendientes con su contacto).
- **Implícito, decidido aquí:** cada **línea** que tenía a cargo pasa a su propio suplente (antes, todas al único suplente); el usuario dado de baja nunca cuenta como suplente válido de sí mismo; los leads que quedan sin asignar no cuentan para la mayoría de un contacto.
- **Test aparte:** el escenario de dos líneas va en `28_baja_por_linea.test.sql` y no en el 17: cada archivo de pgTAP corre en su transacción y en el 17 Diego ya queda desactivado.

## 2026-11-05 · Export CSV: oculto y registrado desde el botón (fase-3/ajustes)
- **Decisión:** `ExportButton` y `BulkExportButton` (shadcn-admin-kit) son el único camino de un export: ellos consultan `canAccess(export)` (se ocultan a ejecutivo y lector en toda lista) y, después de generar el CSV, llaman `dataProvider.logExport(recurso, filas, filtros)` (`admin/log-export.ts`). Si el registro falla, el archivo ya se descargó y se avisa.
- **Base:** RPC `log_export(resource, row_count, filters)`, security definer, solo gerencia (42501), recurso en lista cerrada (22023), escribe `audit_log` con `action = 'export'`.
- **Descartado:** envolver el `exporter` de cada lista (lo que proponía la cola): el exporter no conoce los filtros y una lista nueva podía olvidarlo.

## 2026-11-05 · Decisiones de Ignacio para la cola nocturna 2026-11-05
- **Etapas de solo lectura en Configuración:** el código las trata como constantes (`tekfusion/estados.ts`, reglas de ganado/perdido/archivado); renombrarlas o borrarlas desde la pantalla rompería reglas. Se muestran, no se editan.
- **Dashboard sumado en la base:** ningún rango puede chocar con el tope de PostgREST (`max_rows = 1000`). Las vistas por día se agregan por rango en funciones `security invoker` (`dashboard_summary`, `sales_ranking_summary`); el navegador recibe filas por mes, línea y canal, no por día.
- **Retención (RF-17):** configurable por gerencia en `configuration.config.dataRetentionMonths`; **24 meses por defecto** (docs/08), **0 la desactiva**.
- **Tarea programada con `pg_cron`:** la anonimización por retención corre a diario dentro de la base (no en n8n): no depende del VPS y queda con su pgTAP. Sentry: `@sentry/react` (instalado de día porque el loop nocturno no instala) y `npm:@sentry/deno` en las Edge Functions; ambos apagados con DSN vacío.

## 2026-11-05 · Implícitas en la cola nocturna 2026-11-05 (anotadas en la revisión de la mañana)
- **Qué se anonimiza por retención (T5; decisión de Ignacio, 2026-11-05):** un contacto entra solo si **todos** sus leads están en `perdido`/`archivado` y **no hay ninguna actividad desde el corte**: `last_activity_at` de alguno de sus leads, una nota del contacto o de alguno de sus leads (`date`; las notas no tienen `created_at`/`updated_at`) o una tarea del contacto (`created_at`; `tasks` no tiene `updated_at`). Un contacto **sin leads no se toca**. Corre a las 07:00 UTC. Cuando existan `wa_messages` (Fase 4) y los correos (Fase 5) hay que sumarlos como actividad (queda un TODO en `anonymize_expired_contacts`).
- **Lead compartido (decisión de Ignacio, 2026-11-05):** un lead que también tiene a otro contacto no se toca al anonimizar: ni sus notas, ni `raw_source`, ni sus seguimientos, ni sus alertas.
- **Abiertas para TekFusion:** (1) los leads importados (RF-15) reciben `last_activity_at` = fecha de importación, así que el histórico espera el plazo completo desde la migración: ¿se importa la fecha real? (2) ¿El nombre y la descripción del lead (`deals.name`, `deals.description`) y las cotizaciones con su PDF se borran al anonimizar? Hoy no se tocan (comentario en `anonymize_contact_data`).
- **Qué deja la anonimización (T5, endurecida el 2026-11-05 tras la auditoría):** nombre "Contacto anonimizado #id", sin correo, teléfono, avatar, cargo, antecedentes, LinkedIn ni género, y `contacts.anonymized_at` con la fecha; **así se reconoce un contacto anonimizado, no por el nombre**. "[contenido anonimizado]" en el texto de sus notas y de sus tareas y, en los leads que solo lo tienen a él, en sus notas, en los textos de `followups.messages` (canal y plantilla quedan) y en `alerts.message`; el `raw_source` de esos leads queda vacío. Las alertas solo apuntan a un lead (no tienen columna de contacto). Anonimizar de nuevo no hace nada (devuelve vacío, sin `audit_log`). Leads, montos, etapas y fechas quedan intactos (las métricas sobreviven).
- **Archivos de la retención automática (T5, pendiente):** la corrida de `pg_cron` quita la referencia al adjunto pero el archivo queda en el bucket; el botón manual sí lo borra. Falta la purga de huérfanos.
- **Dueño del lead manual (T2):** solo gerencia elige ejecutivo (vacío = sin asignar); el ejecutivo queda siempre como dueño de lo que crea.
- **Reordenamiento al crear (T6):** `DealCreate` solo corre el índice de los leads que el usuario puede editar (gerencia: todos; ejecutivo: los suyos). Los sin asignar no se reordenan para un ejecutivo, porque la RLS lo rechaza.
- **Rango de retención (T1):** entero de 0 a 120 meses.

## 2026-11-06 · Implícitas en la cola nocturna 2026-11-06 (anotadas en la revisión de la mañana)
Salvo las dos de Ignacio de abajo, ninguna está confirmada por él. Entraron a `main` T1–T8; T9 (bandeja) sigue solo en la rama `nocturno/2026-11-06`.

**Decisiones de Ignacio (2026-11-06):**
- **Leído:** un mensaje entrante se marca leído al abrir la conversación.
- **Bandeja (T9) fuera de `main`:** no se mergea hasta que existan las policies de `wa_*` y la app deje de cerrar la sesión ante un 403.

**Modelo de datos de WhatsApp (T8, `14_tekfusion_whatsapp.sql`).** Diferencias con lo que decía `docs/05`:
- **Ids y enums:** `bigint` y valores en español, como el resto del esquema (no `uuid`).
- **Estado del mensaje:** `wa_messages.status` reutiliza el enum `delivery_status` de las cotizaciones (`pendiente`, `enviado`, `entregado`, `leido`, `fallido`) en vez de crear `mensaje_estado`. Por defecto `pendiente`.
- **No leídos:** el seed usa ese mismo `status` en los mensajes **entrantes** para decir "el ejecutivo ya lo abrió" (`leido`) y calcula `unread_count` como los entrantes que no están en `leido`. Ignacio decidió que se marcan leídos al abrir la conversación (arriba); la Fase 4 lo implementa.
- **Origen:** `origin` pasó de texto libre a enum `wa_message_origin` (`crm`, `seguimiento`, `telefono`) y queda vacío en los entrantes.
- **Columna nueva `job_id` (única):** no estaba en `docs/05`; es para que un envío del CRM o de n8n reintentado no cree dos mensajes, igual que en `followups`.
- **Restricciones nuevas:** `phone` único y en E.164 (`^\+[1-9][0-9]{7,14}$`), `unread_count >= 0`, `wa_instance_status.instance` único. `sent_at` es obligatorio y sin valor por defecto; `text` y `payload` son opcionales; ambas tablas llevan además `created_at`.
- **Borrados:** si se borra el contacto, el lead o el ejecutivo, la conversación y sus mensajes quedan con esa referencia vacía. Una conversación con mensajes **no se puede borrar** (`on delete restrict`): los mensajes nunca se van en cascada.
- **Índices:** solo `(conversation_id, sent_at)` y `(deal_id)` en mensajes. Faltan los de `wa_conversations` por `sales_id` y `last_message_at`; van con las policies.
- **Migración:** `db diff` le puso una hora anterior a migraciones ya escritas; se renombró a `20261106130000_whatsapp_tablas.sql`.

**Tablas cerradas (T8).** RLS activa sin policies y `revoke all` a `authenticated` y `anon`; solo `service_role` lee y escribe. Un usuario logueado que las consulta recibe el error 42501 (403 en la API), **no cero filas**. Al escribir las policies por rol hay que darles también `grant select`.

**Pendiente que T8 deja abierto (Fase 4):** la anonimización y la retención (RF-17) no tocan `wa_conversations` ni `wa_messages` (el TODO ya estaba en `anonymize_expired_contacts`), y `offboard_sale` no reasigna conversaciones.

**Bandeja de solo lectura (T9, en la rama `nocturno/2026-11-06`, no en `main`).**
- **Solo funciona en la demo:** contra Supabase las tablas están cerradas, la lista recibe 403 y la app **cierra la sesión** de gerencia y de ejecutivos al entrar a `/whatsapp` (ra-core trata el 403 como sesión vencida). Visto en la revisión del 2026-11-06 (capturas de la bandeja en `docs/capturas/2026-11-06/` del worktree, no en `main`). En `main` sigue el aviso "próximamente" inofensivo. Por eso T9 espera (decisión de Ignacio, arriba).
- **Lector:** no tiene ninguna acción sobre `wa_*` en `canAccess`; ve "Tu perfil no tiene acceso…" y no se consulta nada. La pestaña WhatsApp del menú sigue visible para él.
- **Pestaña Todos:** acción propia `list_all` sobre `wa_conversations`, solo gerencia. "Mis chats" filtra por `sales_id` = usuario y "Sin asignar" por `sales_id` vacío; en FakeRest eso es solo un filtro de la interfaz (no hay RLS).
- **Archivadas:** la lista esconde las conversaciones con `archived`; no hay forma de verlas.
- **Topes provisionales:** 100 conversaciones por pestaña, 500 mensajes por conversación y hasta 1000 mensajes leídos para armar el extracto de la lista (comentarios `ponytail:` en el código; se reemplazan con Realtime y paginación en la Fase 4).
- **Adjuntos:** solo una ruta de Storage simple se vuelve enlace (cualquier cosa con esquema, `..` o caracteres raros se muestra sin enlace); hoy el enlace es la ruta cruda, sin URL firmada. El audio usa el reproductor del navegador.
- **Texto:** siempre texto plano (React lo escapa); sin HTML ni Markdown.
- **"Tomar" y "Enviar":** visibles pero deshabilitados, con la leyenda "Disponible en la Fase 4".

**Dashboard sumado (T1–T4).** El promedio de primera respuesta del rango es un promedio ponderado por leads respondidos (resumen) o atendidos (ranking), a 2 decimales y vacío si nadie respondió. Las dos funciones son `security invoker` con `execute` solo para `authenticated` y `service_role`. FakeRest las imita en `management-dashboard/summary.ts`.

**Kanban (T5).** Como un ejecutivo ya no corre el índice de leads ajenos ni sin asignar, en una columna pueden quedar índices repetidos (empate, sin error). Sigue pudiendo **arrastrar** una tarjeta ajena o sin asignar: `DealCard` pide permiso sin el registro y el guardado falla por RLS. Pendiente desactivar ese arrastre.

## Plantilla para nuevas decisiones
```
## AAAA-MM-DD · Título
- **Motivo:**
- **Descartado:**
- **Consecuencias:**
```
