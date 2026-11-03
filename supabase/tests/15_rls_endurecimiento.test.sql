-- Correcciones de la revisión de seguridad y de base de datos (2026-11-03):
-- un ejecutivo no se trae contactos ajenos vía deals.contact_ids ni reasigna
-- contactos; siempre queda al menos un manager activo; take_deal no toma
-- leads archivados; PostgREST no escribe email/user_id de sales; anon no
-- ejecuta las funciones; activity_log no expone raw_source.
begin;
select plan(20);

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

create temp table fx as
select
  (select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl') as andrea,
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  0::bigint as foreign_contact, 0::bigint as own_contact, 0::bigint as own_deal,
  0::bigint as free_deal, 0::bigint as archived_free_deal;
insert into public.contacts (first_name, last_name, company_id, sales_id) values ('Ajeno', 'De Diego', 1, (select diego from fx));
update fx set foreign_contact = (select id from public.contacts where first_name = 'Ajeno'),
              own_contact = (select min(id) from public.contacts where sales_id = (select camila from fx)),
              own_deal = (select min(id) from public.deals where sales_id = (select camila from fx) and stage = 'nuevo');
insert into public.deals (name, stage, sales_id, company_id) values ('Libre nuevo', 'nuevo', null, 1);
insert into public.deals (name, stage, sales_id, company_id) values ('Libre archivado', 'archivado', null, 1);
update public.deals set raw_source = '{"asunto": "correo original"}'::jsonb where id = (select own_deal from fx);
update fx set free_deal = (select id from public.deals where name = 'Libre nuevo'),
              archived_free_deal = (select id from public.deals where name = 'Libre archivado');
grant select on fx to authenticated;

-- El último manager activo no se degrada ni se desactiva (tampoco por service role / seed)
select throws_ok(format('update public.sales set disabled = true where id = %s', (select andrea from fx)), '23514', null, 'nadie desactiva al único manager activo, ni siquiera el backend');

-- Ejecutivo --------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok(format('update public.deals set contact_ids = contact_ids || %s where id = %s', (select foreign_contact from fx), (select own_deal from fx)), '42501', null, 'ejecutivo no se trae un contacto ajeno a su lead vía contact_ids');
select throws_ok(format('insert into public.deals (name, stage, company_id, contact_ids) values (%L, %L, 1, array[%s]::bigint[])', 'con ajeno', 'nuevo', (select foreign_contact from fx)), '42501', null, 'ejecutivo no crea un lead con un contacto ajeno');
select lives_ok(format('update public.deals set contact_ids = array[%s]::bigint[] where id = %s', (select own_contact from fx), (select own_deal from fx)), 'ejecutivo enlaza sus propios contactos');
select is((select count(*) from public.contacts where id = (select foreign_contact from fx)), 0::bigint, 'el contacto ajeno sigue invisible');
select throws_ok(format('update public.contacts set sales_id = %s where id = %s', (select diego from fx), (select own_contact from fx)), '42501', null, 'ejecutivo no reasigna un contacto a otro');
select throws_ok(format('insert into public.contacts (first_name, last_name, company_id, sales_id) values (%L, %L, 1, %s)', 'Para', 'Diego', (select diego from fx)), '42501', null, 'ejecutivo no crea contactos a nombre de otro');
select lives_ok('insert into public.contacts (first_name, last_name, company_id) values (''Sin'', ''Dueño'', 1)', 'ejecutivo crea un contacto sin indicar dueño');
select is((select sales_id from public.contacts where first_name = 'Sin' and last_name = 'Dueño'), (select camila from fx), 'el contacto creado queda a su nombre');
select throws_ok(format('update public.sales set email = %L where id = %s', 'otra@tekfusion-demo.cl', (select camila from fx)), '42501', null, 'PostgREST no puede escribir sales.email');
select throws_ok(format('update public.sales set user_id = gen_random_uuid() where id = %s', (select camila from fx)), '42501', null, 'PostgREST no puede escribir sales.user_id');
select throws_ok(format('select public.take_deal(%s)', (select archived_free_deal from fx)), 'P0002', null, 'take_deal no toma un lead archivado aunque esté sin asignar');
select lives_ok(format('select public.take_deal(%s)', (select free_deal from fx)), 'take_deal toma un lead nuevo sin asignar');
select is((select (deal::jsonb ? 'raw_source') from public.activity_log where type = 'deal.created' and (deal::jsonb ->> 'id')::bigint = (select own_deal from fx)), false, 'activity_log no expone raw_source');

-- Gerencia -----------------------------------------------------------------
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok(format('update public.sales set role = %L where id = %s', 'reader', (select andrea from fx)), '23514', null, 'el único manager no puede degradarse a sí mismo');
select lives_ok(format('update public.sales set role = %L where id = %s', 'manager', (select camila from fx)), 'gerencia nombra un segundo manager');
select lives_ok(format('update public.sales set role = %L where id = %s', 'executive', (select andrea from fx)), 'con otro manager activo, el primero sí puede dejar el rol');
reset role;
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select lives_ok(format('update public.contacts set sales_id = %s where id = %s', (select diego from fx), (select own_contact from fx)), 'un manager reasigna contactos');

-- anon y sesiones sin usuario ---------------------------------------------
reset role;
set local role anon;
select throws_ok('select public.take_deal(1)', '42501', null, 'anon no puede ejecutar take_deal');
select throws_ok('select count(*) from public.business_lines', '42501', null, 'anon no tiene privilegios sobre las tablas de configuración');

select * from finish();
rollback;
