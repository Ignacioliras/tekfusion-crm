-- Alertas (docs/08, RF-09): las ve el destinatario y gerencia; solo el
-- destinatario las marca leídas (y solo puede tocar read_at); las crea el
-- sistema (n8n, service role); la misma alerta abierta no se repite.
begin;
select plan(15);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego;
create temp table a as
select
  (select min(id) from public.alerts where recipient_sales_id = (select camila from fx) and read_at is null) as own_alert,
  (select min(id) from public.alerts where recipient_sales_id = (select diego from fx) and read_at is null) as foreign_alert,
  (select count(*) from public.alerts where recipient_sales_id = (select camila from fx)) as camila_alerts;
grant select on fx, a to authenticated, service_role;

-- Lectura ----------------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select ok((select camila_alerts from a) > 0, 'el seed deja alertas a Camila');
select is((select count(*) from public.alerts), (select camila_alerts from a), 'ejecutivo ve solo sus alertas');
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from public.alerts), 10::bigint, 'gerencia ve todas las alertas');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.alerts), 0::bigint, 'lector no ve alertas ajenas');
reset role;

-- Escritura del destinatario ------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
update public.alerts set read_at = now() where id = (select own_alert from a);
update public.alerts set read_at = now() where id = (select foreign_alert from a);
select throws_ok(format('insert into public.alerts (type, recipient_sales_id, message) values (''sin_asignar'', %s, ''x'')', (select camila from fx)),
  '42501', null, 'un usuario no crea alertas (las crea el sistema)');
select throws_ok(format('update public.alerts set recipient_sales_id = %s where id = %s', (select diego from fx), (select own_alert from a)),
  '42501', null, 'el destinatario no reasigna su alerta');
select throws_ok(format('update public.alerts set message = ''otro'' where id = %s', (select own_alert from a)),
  '42501', null, 'el destinatario solo cambia read_at');
select throws_ok(format('update public.alerts set read_at = null where id = %s', (select own_alert from a)),
  '42501', null, 'una alerta leída no se vuelve a abrir');
select throws_ok(format('delete from public.alerts where id = %s', (select own_alert from a)),
  '42501', null, 'nadie borra alertas');
reset role;
select isnt((select read_at from public.alerts where id = (select own_alert from a)), null, 'el destinatario marca su alerta como leída');
select is((select read_at from public.alerts where id = (select foreign_alert from a)), null, 'nadie marca leída una alerta ajena');

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
update public.alerts set read_at = now() where id = (select foreign_alert from a);
reset role;
select is((select read_at from public.alerts where id = (select foreign_alert from a)), null,
  'gerencia ve las alertas de otros pero no las marca leídas por ellos');

-- Sistema y deduplicación ---------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select throws_ok(format('insert into public.alerts (type, recipient_sales_id, deal_id, message) select type, recipient_sales_id, deal_id, ''repetida'' from public.alerts where id = %s',
    (select foreign_alert from a)), '23505', null, 'la misma alerta abierta no se repite');
select throws_ok(format('insert into public.alerts (type, recipient_sales_id, message) values (''whatsapp_desconectado'', %1$s, ''a''), (''whatsapp_desconectado'', %1$s, ''b'')',
    (select camila from fx)), '23505', null, 'tampoco se repite una alerta abierta sin lead');
select lives_ok(format('insert into public.alerts (type, recipient_sales_id, deal_id, message) select type, recipient_sales_id, deal_id, ''de nuevo'' from public.alerts where id = %s',
    (select own_alert from a)), 'una alerta ya leída puede volver a abrirse');
reset role;

select * from finish();
rollback;
