-- WhatsApp (Fase 4): tablas wa_conversations, wa_messages y wa_instance_status.
-- wa_instance_status está cerrada para todo usuario logueado; anon no lee ni
-- escribe ninguna de las tres; el service role (Edge Function receptora, n8n)
-- lee y escribe. wa_message_id es único (CLAUDE.md regla 2).
-- Lo que cada rol ve de conversaciones y mensajes: 35_rls_whatsapp.
begin;
select plan(20);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Sin privilegios no hay filas: cada lectura y cada alta falla con 42501.
-- instance_only: lo único que sigue cerrado también para un usuario logueado.
create temp table closed_statements (sql text, label text, instance_only boolean);
insert into closed_statements values
  ('select count(*) from public.wa_conversations', 'no lee conversaciones', false),
  ('select count(*) from public.wa_messages', 'no lee mensajes', false),
  ('select count(*) from public.wa_instance_status', 'no lee el estado de WhatsApp', true),
  ('insert into public.wa_conversations (phone) values (''+56900009999'')', 'no crea conversaciones', false),
  ('insert into public.wa_messages (conversation_id, wa_message_id, direction, type, sent_at) values (1, ''DEMO-WA-X'', ''entrante'', ''texto'', now())', 'no crea mensajes', false),
  ('insert into public.wa_instance_status (instance) values (''otra'')', 'no escribe el estado de WhatsApp', true);
grant select on closed_statements to authenticated, anon;

select is((select count(*) from public.wa_conversations), 3::bigint, 'el seed deja 3 conversaciones');

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok(sql, '42501', null, 'gerencia ' || label) from closed_statements where instance_only;
reset role;
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok(sql, '42501', null, 'ejecutivo ' || label) from closed_statements where instance_only;
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(sql, '42501', null, 'lector ' || label) from closed_statements where instance_only;
reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select throws_ok(sql, '42501', null, 'anon ' || label) from closed_statements;
reset role;

-- Service role -----------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select is((select count(*) from public.wa_conversations), 3::bigint, 'service role lee las conversaciones');
select ok((select count(*) from public.wa_messages) > 0, 'service role lee los mensajes');
select is((select count(*) from public.wa_instance_status), 1::bigint, 'service role lee el estado de WhatsApp');
select lives_ok('insert into public.wa_conversations (phone) values (''+56900009999'')', 'service role crea una conversación');
select lives_ok($$insert into public.wa_messages (conversation_id, wa_message_id, direction, type, text, sent_at)
  select id, 'DEMO-WA-NUEVO', 'entrante', 'texto', 'hola', now() from public.wa_conversations where phone = '+56900009999'$$,
  'service role guarda un mensaje');
select lives_ok('insert into public.wa_instance_status (instance) values (''otra-demo'')', 'service role escribe el estado de WhatsApp');
select throws_ok($$insert into public.wa_messages (conversation_id, wa_message_id, direction, type, text, sent_at)
  select id, 'DEMO-WA-NUEVO', 'entrante', 'texto', 'reintento', now() from public.wa_conversations where phone = '+56900009999'$$,
  '23505', null, 'un wa_message_id repetido (reintento del webhook) no crea otra fila');
reset role;

select * from finish();
rollback;
