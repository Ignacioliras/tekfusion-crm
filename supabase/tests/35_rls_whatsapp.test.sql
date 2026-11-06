-- 🔒 RLS de WhatsApp (docs/08, fila "conversaciones, mensajes"): gerencia ve
-- todas las conversaciones; el ejecutivo, las suyas y las sin asignar; el
-- lector, ninguna. Un mensaje se ve si se ve su conversación. Ningún usuario
-- logueado inserta, actualiza ni borra (solo service role y sus RPC); anon, nada.
-- Seed: +56900000001 es de Camila, +56900000002 de Diego, +56900000003 sin asignar.
begin;
select plan(41);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create temp table expected as
select (select count(*) from public.wa_messages) as all_messages,
       (select count(*) from public.wa_messages m
          join public.wa_conversations c on c.id = m.conversation_id
         where c.phone in ('+56900000001', '+56900000003')) as camila_messages;
grant select on expected to authenticated;

-- Sin privilegio, cada sentencia falla con 42501 (no es que afecte 0 filas).
create temp table closed_statements (sql text, label text, is_write boolean);
insert into closed_statements values
  ('select count(*) from public.wa_conversations', 'no lee conversaciones', false),
  ('select count(*) from public.wa_messages', 'no lee mensajes', false),
  ('insert into public.wa_conversations (phone) values (''+56900009999'')', 'no crea conversaciones', true),
  ('update public.wa_conversations set archived = true', 'no actualiza conversaciones', true),
  ('delete from public.wa_conversations', 'no borra conversaciones', true),
  ('insert into public.wa_messages (conversation_id, wa_message_id, direction, type, sent_at) values (1, ''DEMO-WA-X'', ''entrante'', ''texto'', now())', 'no crea mensajes', true),
  ('update public.wa_messages set text = ''cambiado''', 'no actualiza mensajes', true),
  ('delete from public.wa_messages', 'no borra mensajes', true);
grant select on closed_statements to authenticated, anon;

select is(
  (select string_agg(table_name || ':' || privilege_type, ',' order by table_name, privilege_type)
     from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public' and table_name like 'wa\_%'),
  'wa_conversations:SELECT,wa_messages:SELECT',
  'authenticated solo tiene select sobre conversaciones y mensajes, y nada sobre wa_instance_status');

-- Gerencia -----------------------------------------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from public.wa_conversations), 3::bigint, 'gerencia ve las 3 conversaciones del seed');
select is((select count(*) from public.wa_messages), (select all_messages from expected), 'gerencia ve todos los mensajes');
select throws_ok(sql, '42501', null, 'gerencia ' || label) from closed_statements where is_write;
reset role;

-- Ejecutivo ----------------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select results_eq(
  'select phone from public.wa_conversations order by phone',
  $$values ('+56900000001'), ('+56900000003')$$,
  'el ejecutivo ve solo sus conversaciones y las sin asignar');
select is((select count(*) from public.wa_messages), (select camila_messages from expected),
  'el ejecutivo ve los mensajes de sus conversaciones y de las sin asignar');
select is((select count(*) from public.wa_messages where wa_message_id in ('DEMO-WA-0006', 'DEMO-WA-0007', 'DEMO-WA-0008', 'DEMO-WA-0009')),
  0::bigint, 'el ejecutivo no ve los mensajes de la conversación de otro ejecutivo');
select throws_ok(sql, '42501', null, 'ejecutivo ' || label) from closed_statements where is_write;
reset role;

select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select results_eq(
  'select phone from public.wa_conversations order by phone',
  $$values ('+56900000002'), ('+56900000003')$$,
  'otro ejecutivo ve la suya y la sin asignar, no la de su colega');
reset role;

-- Lector -------------------------------------------------------------------------
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.wa_conversations), 0::bigint, 'el lector no ve ninguna conversación');
select is((select count(*) from public.wa_messages), 0::bigint, 'el lector no ve ningún mensaje');
select throws_ok(sql, '42501', null, 'lector ' || label) from closed_statements where is_write;
reset role;

-- Un lector que quedó como dueño de una conversación (p. ej. un ejecutivo
-- degradado) tampoco la ve; y al tener dueño, deja de estar "sin asignar".
update public.wa_conversations
   set sales_id = (select id from public.sales where email = 'pablo.herrera@tekfusion-demo.cl')
 where phone = '+56900000003';
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.wa_conversations), 0::bigint, 'el lector no ve ni la conversación que tiene asignada');
select is((select count(*) from public.wa_messages), 0::bigint, 'el lector no ve los mensajes de la conversación que tiene asignada');
reset role;
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select results_eq(
  'select phone from public.wa_conversations order by phone',
  $$values ('+56900000001')$$,
  'una conversación asignada a otro usuario deja de verla el ejecutivo');
select is((select count(*) from public.wa_messages where wa_message_id = 'DEMO-WA-0010'), 0::bigint,
  'y sus mensajes dejan de verse junto con ella');
reset role;

-- Gerencia sin el segundo factor verificado (aal1): no ve nada (docs/08).
select set_config('request.jwt.claims', json_build_object(
  'sub', (select user_id from public.sales where email = 'andrea.soto@tekfusion-demo.cl'),
  'role', 'authenticated', 'aal', 'aal1')::text, true);
set local role authenticated;
select is((select count(*) from public.wa_conversations), 0::bigint, 'gerencia sin TOTP verificado no ve conversaciones');
select is((select count(*) from public.wa_messages), 0::bigint, 'gerencia sin TOTP verificado no ve mensajes');
reset role;

-- anon ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select throws_ok(sql, '42501', null, 'anon ' || label) from closed_statements;
reset role;

select * from finish();
rollback;
