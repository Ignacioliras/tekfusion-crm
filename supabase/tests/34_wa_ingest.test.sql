-- Ingreso de WhatsApp (docs/07, Receptor): wa_ingest_message,
-- wa_update_message_status y wa_upsert_instance_status. Solo el service role
-- las ejecuta; un reintento del webhook (mismo wa_message_id) no cambia nada.
begin;
select plan(38);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Estado inicial de la conversación del seed (+56900000001, con lead y ejecutivo).
create temp table seed_conv as
  select id, active_deal_id, sales_id, unread_count, last_message_at
  from public.wa_conversations where phone = '+56900000001';
grant select on seed_conv to service_role;

select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;

-- Conversación nueva ---------------------------------------------------------
select is(
  public.wa_ingest_message('demo', 'DEMO-T34-0001', '+56900003401', 'entrante', 'texto', 'Hola, cotización de geoceldas', now(), '{"demo": true}') ->> 'inserted',
  'true', 'un entrante de un número nuevo se guarda');
select is((select count(*) from public.wa_conversations where phone = '+56900003401'), 1::bigint, 'crea la conversación del número nuevo');
select is((select unread_count from public.wa_conversations where phone = '+56900003401'), 1, 'la conversación nueva queda con 1 no leído');
select is((select last_message_at from public.wa_conversations where phone = '+56900003401'), now(), 'last_message_at es la hora del mensaje');
select is(
  (select m.conversation_id from public.wa_messages m where m.wa_message_id = 'DEMO-T34-0001'),
  (select id from public.wa_conversations where phone = '+56900003401'),
  'el mensaje cuelga de la conversación nueva');
-- El cuerpo crudo va a wa_message_payloads, no a wa_messages (docs/10).
select is(
  (select p.payload ->> 'demo' from public.wa_message_payloads p
     join public.wa_messages m on m.id = p.message_id where m.wa_message_id = 'DEMO-T34-0001'),
  'true', 'el cuerpo crudo del webhook queda en wa_message_payloads');
select hasnt_column('public', 'wa_messages', 'payload', 'wa_messages no guarda el cuerpo crudo');

-- Conversación existente -----------------------------------------------------
select is(
  public.wa_ingest_message('demo', 'DEMO-T34-0002', '+56900000001', 'entrante', 'texto', '¿Hay stock?', now() + interval '1 minute', null) ->> 'conversation_id',
  (select id::text from seed_conv), 'un entrante de un número conocido usa su conversación');
select is((select count(*) from public.wa_conversations where phone = '+56900000001'), 1::bigint, 'no duplica la conversación');
select is((select deal_id from public.wa_messages where wa_message_id = 'DEMO-T34-0002'), (select active_deal_id from seed_conv), 'el mensaje toma el lead activo de la conversación');
select is((select unread_count from public.wa_conversations where phone = '+56900000001'), (select unread_count + 1 from seed_conv), 'suma 1 no leído');
select is((select last_message_at from public.wa_conversations where phone = '+56900000001'), now() + interval '1 minute', 'avanza last_message_at');
select is(
  (select origin::text || from_me_phone::text || coalesce(author_sales_id::text, '-') from public.wa_messages where wa_message_id = 'DEMO-T34-0002'),
  null, 'un entrante no tiene origen');

-- Reintento idempotente --------------------------------------------------------
select is(
  public.wa_ingest_message('demo', 'DEMO-T34-0002', '+56900000001', 'entrante', 'texto', '¿Hay stock?', now() + interval '1 minute', null),
  jsonb_build_object('conversation_id', (select id from seed_conv),
                     'message_id', (select id from public.wa_messages where wa_message_id = 'DEMO-T34-0002'),
                     'inserted', false),
  'el reintento devuelve el mismo mensaje con inserted false');
select is((select count(*) from public.wa_messages where wa_message_id = 'DEMO-T34-0002'), 1::bigint, 'el reintento no crea otra fila');
select is((select unread_count from public.wa_conversations where phone = '+56900000001'), (select unread_count + 1 from seed_conv), 'el reintento no vuelve a sumar no leídos');

-- Un mensaje más antiguo no retrocede last_message_at.
select is(
  public.wa_ingest_message('demo', 'DEMO-T34-0003', '+56900000001', 'entrante', 'texto', 'mensaje atrasado', now() - interval '1 day', null) ->> 'inserted',
  'true', 'un entrante atrasado se guarda');
select is((select last_message_at from public.wa_conversations where phone = '+56900000001'), now() + interval '1 minute', 'un mensaje atrasado no retrocede last_message_at');

-- Saliente escrito desde el teléfono (fromMe sin job_id) -----------------------
select is(
  public.wa_ingest_message('demo', 'DEMO-T34-0004', '+56900000001', 'saliente', 'texto', 'Sí, hay stock', now() + interval '2 minutes', null) ->> 'inserted',
  'true', 'un saliente desde el teléfono se guarda');
select is((select origin::text from public.wa_messages where wa_message_id = 'DEMO-T34-0004'), 'telefono', 'origen telefono');
select is((select from_me_phone from public.wa_messages where wa_message_id = 'DEMO-T34-0004'), true, 'marcado como escrito desde el teléfono');
select is((select author_sales_id from public.wa_messages where wa_message_id = 'DEMO-T34-0004'), (select sales_id from seed_conv), 'atribuido al ejecutivo de la conversación');
select is((select unread_count from public.wa_conversations where phone = '+56900000001'), (select unread_count + 2 from seed_conv), 'un saliente no suma no leídos');

-- Saliente del CRM (con job_id): no se atribuye al teléfono.
select is(
  public.wa_ingest_message('demo', 'DEMO-T34-0005', '+56900000001', 'saliente', 'texto', 'Adjunto cotización', now() + interval '3 minutes', null, 'DEMO-JOB-T34') ->> 'inserted',
  'true', 'un saliente con job_id se guarda');
select is(
  (select coalesce(origin::text, '-') || ' ' || from_me_phone::text || ' ' || coalesce(author_sales_id::text, '-') || ' ' || job_id
   from public.wa_messages where wa_message_id = 'DEMO-T34-0005'),
  '- false - DEMO-JOB-T34', 'con job_id no queda como mensaje del teléfono');

-- Estado de entrega que nunca retrocede ---------------------------------------
select is(public.wa_update_message_status('DEMO-T34-0004', 'enviado'), true, 'pendiente -> enviado');
select is(public.wa_update_message_status('DEMO-T34-0004', 'leido'), true, 'enviado -> leido');
select is(public.wa_update_message_status('DEMO-T34-0004', 'entregado'), false, 'leido no retrocede a entregado');
select is(public.wa_update_message_status('DEMO-T34-0004', 'fallido'), false, 'leido no pasa a fallido');
select is((select status::text from public.wa_messages where wa_message_id = 'DEMO-T34-0004'), 'leido', 'el estado sigue en leido');
select is(public.wa_update_message_status('DEMO-T34-0005', 'fallido'), true, 'pendiente -> fallido');
select is(public.wa_update_message_status('DEMO-T34-0005', 'entregado'), false, 'fallido no cambia después');
select is(public.wa_update_message_status('DEMO-NO-EXISTE', 'enviado'), false, 'un wa_message_id desconocido no cambia nada');

-- Estado de la instancia ------------------------------------------------------
select public.wa_upsert_instance_status('demo-t34', false, '{"state": "close"}');
select public.wa_upsert_instance_status('demo-t34', true, '{"state": "open"}');
select is(
  (select count(*)::text || ' ' || bool_and(connected)::text || ' ' || max(last_event ->> 'state') from public.wa_instance_status where instance = 'demo-t34'),
  '1 true open', 'el upsert de la instancia deja una fila con el último estado');
reset role;

-- authenticated y anon no pueden ejecutarlas ----------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok($$select public.wa_ingest_message('demo', 'DEMO-T34-X', '+56900003402', 'entrante', 'texto', 'x', now(), null)$$, '42501', null, 'gerencia no ejecuta wa_ingest_message');
select throws_ok($$select public.wa_update_message_status('DEMO-T34-0001', 'leido')$$, '42501', null, 'gerencia no ejecuta wa_update_message_status');
select throws_ok($$select public.wa_upsert_instance_status('demo-t34', false, null)$$, '42501', null, 'gerencia no ejecuta wa_upsert_instance_status');
reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select throws_ok($$select public.wa_ingest_message('demo', 'DEMO-T34-X', '+56900003402', 'entrante', 'texto', 'x', now(), null)$$, '42501', null, 'anon no ejecuta wa_ingest_message');
reset role;

select * from finish();
rollback;
