-- RLS de deals (leads), docs/08 + decisiones 3 y 4 (docs/10).
-- Usuarios del seed: Andrea (manager), Camila y Diego (executive), Pablo (reader).
-- Las policies no lanzan error en update/delete: filtran filas. Por eso se mide
-- cuántas filas tocó cada DML con exec_count(); los insert y los with check sí lanzan 42501.
begin;
select plan(24);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.exec_count(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

-- Fixture (como postgres): ids del seed y un lead sin asignar.
create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  (select count(*) from public.deals) as total,
  (select count(*) from public.deals where sales_id = (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl')) as camila_total,
  (select count(*) from public.deals where sales_id = (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl')) as diego_total,
  (select min(id) from public.deals where sales_id = (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl')) as own_deal,
  (select min(id) from public.deals where sales_id = (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl')) as foreign_deal,
  0::bigint as unassigned;
insert into public.deals (name, stage, sales_id, company_id) values ('Lead sin asignar', 'nuevo', null, 1);
update fx set unassigned = (select id from public.deals where name = 'Lead sin asignar');
grant select on fx to authenticated;

-- Ejecutivo --------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.deals), (select camila_total + 1 from fx), 'ejecutivo ve solo sus leads más los sin asignar');
select is((select count(*) from public.deals where id = (select foreign_deal from fx)), 0::bigint, 'ejecutivo no ve un lead ajeno');
select is(pg_temp.exec_count(format('update public.deals set name = %L where id = %s', 'x', (select foreign_deal from fx))), 0::bigint, 'ejecutivo no edita un lead ajeno');
select is(pg_temp.exec_count(format('update public.deals set description = %L where id = %s', 'editado', (select own_deal from fx))), 1::bigint, 'ejecutivo edita su propio lead');
select throws_ok(format('update public.deals set sales_id = %s where id = %s', (select diego from fx), (select own_deal from fx)), '42501', null, 'ejecutivo no reasigna su lead a otro');
select throws_ok(format('insert into public.deals (name, stage, sales_id, company_id) values (%L, %L, %s, 1)', 'ajeno', 'nuevo', (select diego from fx)), '42501', null, 'ejecutivo no crea leads a nombre de otro');
select lives_ok('insert into public.deals (name, stage, company_id) values (''propio'', ''nuevo'', 1)', 'ejecutivo crea un lead (el trigger lo asigna a él)');
select is((select sales_id from public.deals where name = 'propio'), (select camila from fx), 'el lead creado queda asignado al ejecutivo');
select is(pg_temp.exec_count(format('delete from public.deals where id = %s', (select own_deal from fx))), 0::bigint, 'ejecutivo no borra ni su propio lead');
select is(pg_temp.exec_count(format('update public.deals set name = %L where id = %s', 'x', (select unassigned from fx))), 0::bigint, 'ejecutivo no edita un lead sin asignar sin tomarlo');
select lives_ok(format('select public.take_deal(%s)', (select unassigned from fx)), 'ejecutivo toma un lead sin asignar');
select is((select sales_id from public.deals where id = (select unassigned from fx)), (select camila from fx), 'el lead tomado queda a su nombre');

reset role;
select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select is((select count(*) from public.deals), (select diego_total from fx), 'el otro ejecutivo ya no ve el lead tomado');
select throws_ok(format('select public.take_deal(%s)', (select unassigned from fx)), 'P0002', null, 'un lead ya tomado no se puede volver a tomar');

-- Lector -------------------------------------------------------------------
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.deals), (select total + 2 from fx), 'lector ve todos los leads');
select throws_ok('insert into public.deals (name, stage, company_id) values (''lector'', ''nuevo'', 1)', '42501', null, 'lector no crea leads');
select is(pg_temp.exec_count(format('update public.deals set name = %L where id = %s', 'x', (select own_deal from fx))), 0::bigint, 'lector no edita leads');
select throws_ok(format('select public.take_deal(%s)', (select foreign_deal from fx)), '42501', null, 'lector no toma leads');
select is(pg_temp.exec_count('delete from public.deals'), 0::bigint, 'lector no borra leads');

-- Gerencia -----------------------------------------------------------------
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from public.deals), (select total + 2 from fx), 'gerencia ve todos los leads');
select is(pg_temp.exec_count(format('update public.deals set description = %L where id = %s', 'gerencia', (select foreign_deal from fx))), 1::bigint, 'gerencia edita cualquier lead');
select lives_ok(format('update public.deals set sales_id = %s where id = %s', (select camila from fx), (select foreign_deal from fx)), 'gerencia reasigna leads');
select is(pg_temp.exec_count('delete from public.deals'), 0::bigint, 'nadie borra leads, ni gerencia (decisión 3)');

-- anon ---------------------------------------------------------------------
reset role;
set local role anon;
select is((select count(*) from public.deals), 0::bigint, 'anon no ve leads');

select * from finish();
rollback;
