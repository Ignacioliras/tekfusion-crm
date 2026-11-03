-- RLS de contacts y companies, docs/08 + decisiones 3 y 5 (docs/10).
-- Un ejecutivo ve un contacto si es suyo o si está en un lead que puede ver
-- (propio o sin asignar). Las empresas las ve todo usuario interno.
-- Solo gerencia borra contactos y empresas.
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

-- Fixture (como postgres): una empresa de Diego con un contacto solo ligado a
-- un lead de Diego (invisible para Camila), otro contacto ligado a un lead sin
-- asignar (visible), y una empresa vacía para borrar.
create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  0::bigint as company_x, 0::bigint as contact_hidden, 0::bigint as contact_unassigned,
  0::bigint as own_contact, 0::bigint as empty_company;
insert into public.companies (name, sales_id) values ('Empresa Solo Diego', (select diego from fx));
update fx set company_x = (select id from public.companies where name = 'Empresa Solo Diego');
insert into public.contacts (first_name, last_name, company_id, sales_id)
  values ('Oculto', 'Para Camila', (select company_x from fx), (select diego from fx));
update fx set contact_hidden = (select id from public.contacts where first_name = 'Oculto');
insert into public.contacts (first_name, last_name, company_id, sales_id)
  values ('Visible', 'Por Lead Libre', (select company_x from fx), (select diego from fx));
update fx set contact_unassigned = (select id from public.contacts where first_name = 'Visible');
insert into public.deals (name, stage, sales_id, company_id, contact_ids)
  values ('Lead de Diego', 'nuevo', (select diego from fx), (select company_x from fx), array[(select contact_hidden from fx)]);
insert into public.deals (name, stage, sales_id, company_id, contact_ids)
  values ('Lead libre', 'nuevo', null, (select company_x from fx), array[(select contact_unassigned from fx)]);
update fx set own_contact = (select min(id) from public.contacts where sales_id = (select camila from fx));
insert into public.companies (name) values ('Empresa Vacía');
update fx set empty_company = (select id from public.companies where name = 'Empresa Vacía');
grant select on fx to authenticated;

-- Ejecutivo --------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.contacts where id = (select contact_hidden from fx)), 0::bigint, 'ejecutivo no ve un contacto que solo está en leads ajenos');
select is((select count(*) from public.contacts where id = (select contact_unassigned from fx)), 1::bigint, 'ejecutivo ve un contacto de un lead sin asignar');
select is((select count(*) from public.contacts where id = (select own_contact from fx)), 1::bigint, 'ejecutivo ve sus propios contactos');
select is((select count(*) from public.companies where id = (select company_x from fx)), 1::bigint, 'ejecutivo ve todas las empresas (decisión 5)');
select is(pg_temp.exec_count(format('update public.contacts set title = %L where id = %s', 'Jefa', (select own_contact from fx))), 1::bigint, 'ejecutivo edita su propio contacto');
select is(pg_temp.exec_count(format('update public.contacts set title = %L where id = %s', 'x', (select contact_hidden from fx))), 0::bigint, 'ejecutivo no edita un contacto ajeno');
select lives_ok(format('insert into public.contacts (first_name, last_name, company_id) values (%L, %L, %s)', 'Nuevo', 'Contacto', (select company_x from fx)), 'ejecutivo crea contactos');
select is(pg_temp.exec_count(format('delete from public.contacts where id = %s', (select own_contact from fx))), 0::bigint, 'ejecutivo no borra contactos');
select is(pg_temp.exec_count(format('delete from public.companies where id = %s', (select empty_company from fx))), 0::bigint, 'ejecutivo no borra empresas');
select is((select count(*) from public.contacts_summary), (select count(*) from public.contacts), 'la vista contacts_summary respeta la RLS del ejecutivo');
select is((select nb_deals from public.companies_summary where id = (select company_x from fx)), 1::bigint, 'companies_summary cuenta solo los leads visibles para el ejecutivo (el sin asignar sí, el de Diego no)');

-- Lector -------------------------------------------------------------------
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.contacts where id = (select contact_hidden from fx)), 1::bigint, 'lector ve todos los contactos');
select throws_ok(format('insert into public.contacts (first_name, last_name, company_id) values (%L, %L, %s)', 'Lector', 'X', (select company_x from fx)), '42501', null, 'lector no crea contactos');
select is(pg_temp.exec_count(format('update public.contacts set title = %L where id = %s', 'x', (select contact_hidden from fx))), 0::bigint, 'lector no edita contactos');
select is(pg_temp.exec_count('delete from public.contacts'), 0::bigint, 'lector no borra contactos');
select throws_ok(format('insert into public.companies (name) values (%L)', 'Lector SpA'), '42501', null, 'lector no crea empresas');

-- Gerencia -----------------------------------------------------------------
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select nb_deals from public.companies_summary where id = (select company_x from fx)), 2::bigint, 'gerencia cuenta todos los leads de la empresa en companies_summary');
select is(pg_temp.exec_count(format('update public.contacts set title = %L where id = %s', 'Gerencia', (select contact_hidden from fx))), 1::bigint, 'gerencia edita cualquier contacto');
select is(pg_temp.exec_count(format('delete from public.contacts where id = %s', (select contact_hidden from fx))), 1::bigint, 'solo gerencia borra contactos');
select is(pg_temp.exec_count(format('delete from public.companies where id = %s', (select empty_company from fx))), 1::bigint, 'solo gerencia borra empresas');

select * from finish();
rollback;
