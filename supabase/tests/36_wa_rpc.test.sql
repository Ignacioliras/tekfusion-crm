-- RPC de la bandeja de WhatsApp: take_wa_conversation y mark_wa_conversation_read.
-- Tomar: gerencia o ejecutivo, solo si está sin asignar y no archivada (si no,
-- P0002); lector o sin sale, 42501. Marcar leído: gerencia o el ejecutivo
-- asignado; una conversación SIN ASIGNAR no cambia y devuelve 0 (decisión de
-- Ignacio, docs/10); ejecutivo sobre una ajena, 42501.
-- Seed: +56900000001 es de Camila (2 entrantes sin leer), +56900000002 de Diego
-- (0 sin leer), +56900000003 sin asignar (4 sin leer).
begin;
select plan(27);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Usuario logueado sin fila en sales.
create function pg_temp.login_without_sale() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Una sin asignar extra (para gerencia) y una sin asignar archivada.
insert into public.wa_conversations (phone) values ('+56900000091');
insert into public.wa_conversations (phone, archived) values ('+56900000092', true);

create temp table conv as select phone, id from public.wa_conversations;
create temp table people as select email, id from public.sales;
grant select on conv, people to authenticated;

-- Permisos de ejecución ----------------------------------------------------------
select ok(has_function_privilege('authenticated', 'public.take_wa_conversation(bigint)', 'execute')
      and not has_function_privilege('anon', 'public.take_wa_conversation(bigint)', 'execute')
      and not has_function_privilege('service_role', 'public.take_wa_conversation(bigint)', 'execute'),
  'take_wa_conversation solo la ejecuta authenticated');
select ok(has_function_privilege('authenticated', 'public.mark_wa_conversation_read(bigint)', 'execute')
      and not has_function_privilege('anon', 'public.mark_wa_conversation_read(bigint)', 'execute')
      and not has_function_privilege('service_role', 'public.mark_wa_conversation_read(bigint)', 'execute'),
  'mark_wa_conversation_read solo la ejecuta authenticated');

-- Marcar leído: sin permiso ------------------------------------------------------
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(format('select public.mark_wa_conversation_read(%s)', id), '42501', null,
  'el lector no marca leída una conversación') from conv where phone = '+56900000001';
reset role;

select pg_temp.login_without_sale();
select throws_ok(format('select public.mark_wa_conversation_read(%s)', id), '42501', null,
  'un usuario sin sale no marca leída una conversación') from conv where phone = '+56900000001';
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok(format('select public.mark_wa_conversation_read(%s)', id), '42501', null,
  'el ejecutivo no marca leída la conversación de otro ejecutivo') from conv where phone = '+56900000002';

-- Marcar leído: sin asignar no cambia nada ---------------------------------------
select is(public.mark_wa_conversation_read(id), 0, 'el ejecutivo abre una sin asignar: devuelve 0')
  from conv where phone = '+56900000003';
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is(public.mark_wa_conversation_read(id), 0, 'gerencia abre una sin asignar: también devuelve 0')
  from conv where phone = '+56900000003';
reset role;

select is((select unread_count from public.wa_conversations where phone = '+56900000003'), 4,
  'la sin asignar sigue con 4 no leídos');
select is((select count(*) from public.wa_messages m join conv on conv.id = m.conversation_id
            where conv.phone = '+56900000003' and m.status = 'leido'), 0::bigint,
  'ningún mensaje de la sin asignar pasó a leído');

-- Marcar leído: el ejecutivo asignado --------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is(public.mark_wa_conversation_read(id), 2, 'el ejecutivo marca leída la suya: 2 mensajes')
  from conv where phone = '+56900000001';
reset role;

select is((select unread_count from public.wa_conversations where phone = '+56900000001'), 0,
  'unread_count queda en 0');
select is((select count(*) from public.wa_messages m join conv on conv.id = m.conversation_id
            where conv.phone = '+56900000001' and m.direction = 'entrante' and m.status <> 'leido'), 0::bigint,
  'todos los entrantes de la conversación quedan en leído');
select is((select status::text from public.wa_messages where wa_message_id = 'DEMO-WA-0003'), 'entregado',
  'los salientes no cambian de estado');

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is(public.mark_wa_conversation_read(id), 0, 'marcarla de nuevo devuelve 0')
  from conv where phone = '+56900000001';
reset role;

-- Marcar leído: gerencia sobre la de un ejecutivo --------------------------------
select public.wa_ingest_message('demo', 'DEMO-WA-T36-1', '+56900000002', 'entrante', 'texto',
  'Mensaje nuevo de prueba', now(), '{}'::jsonb);
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is(public.mark_wa_conversation_read(id), 1, 'gerencia marca leída la conversación de un ejecutivo')
  from conv where phone = '+56900000002';
select throws_ok('select public.mark_wa_conversation_read(-1)', 'P0002', null,
  'marcar una conversación inexistente da P0002');
reset role;
select is((select unread_count from public.wa_conversations where phone = '+56900000002'), 0,
  'unread_count de la conversación del ejecutivo queda en 0');

-- Tomar: sin permiso -------------------------------------------------------------
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(format('select public.take_wa_conversation(%s)', id), '42501', null,
  'el lector no toma una conversación') from conv where phone = '+56900000003';
reset role;

select pg_temp.login_without_sale();
select throws_ok(format('select public.take_wa_conversation(%s)', id), '42501', null,
  'un usuario sin sale no toma una conversación') from conv where phone = '+56900000003';
reset role;

-- Tomar: ejecutivo y gerencia ----------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select t.sales_id from conv, public.take_wa_conversation(conv.id) t where conv.phone = '+56900000003'),
  (select id from people where email = 'camila.rojas@tekfusion-demo.cl'),
  'el ejecutivo toma una sin asignar y queda como dueño');
select throws_ok(format('select public.take_wa_conversation(%s)', id), 'P0002', null,
  'tomar una archivada da P0002') from conv where phone = '+56900000092';
select throws_ok('select public.take_wa_conversation(-1)', 'P0002', null,
  'tomar una conversación inexistente da P0002');
select throws_ok(format('select public.take_wa_conversation(%s)', id), 'P0002', null,
  'tomar la propia ya asignada da P0002') from conv where phone = '+56900000001';
reset role;

select is((select s.email from public.wa_conversations c join public.sales s on s.id = c.sales_id
            where c.phone = '+56900000003'), 'camila.rojas@tekfusion-demo.cl',
  'la asignación queda guardada');
select is((select sales_id from public.wa_conversations where phone = '+56900000092'), null::bigint,
  'la archivada sigue sin asignar');

select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select throws_ok(format('select public.take_wa_conversation(%s)', id), 'P0002', null,
  'otro ejecutivo no toma la que ya se tomó') from conv where phone = '+56900000003';
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select t.sales_id from conv, public.take_wa_conversation(conv.id) t where conv.phone = '+56900000091'),
  (select id from people where email = 'andrea.soto@tekfusion-demo.cl'),
  'gerencia toma una sin asignar');
reset role;

select * from finish();
rollback;
