-- Notas de lead, notas de contacto y tareas heredan la visibilidad del padre
-- (docs/08 "según el lead"); las vistas y la búsqueda global pasan por la RLS.
begin;
select plan(17);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.exec_count(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

-- Fixture (como postgres): un lead y un contacto de Diego, con su nota y su
-- tarea, que Camila no debe ver; y un lead y un contacto de Camila.
create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  0::bigint as diego_deal, 0::bigint as diego_note, 0::bigint as diego_contact, 0::bigint as diego_task,
  0::bigint as camila_deal, 0::bigint as camila_contact;
insert into public.deals (name, stage, sales_id, company_id) values ('Zebrafixture', 'nuevo', (select diego from fx), 1);
update fx set diego_deal = (select id from public.deals where name = 'Zebrafixture');
insert into public.deal_notes (deal_id, text, date, sales_id) values ((select diego_deal from fx), 'nota de diego', now(), (select diego from fx));
update fx set diego_note = (select id from public.deal_notes where text = 'nota de diego');
insert into public.contacts (first_name, last_name, company_id, sales_id) values ('Solo', 'Diego', 1, (select diego from fx));
update fx set diego_contact = (select id from public.contacts where first_name = 'Solo' and last_name = 'Diego');
insert into public.tasks (contact_id, type, text, due_date, sales_id) values ((select diego_contact from fx), 'call', 'tarea de diego', now(), (select diego from fx));
update fx set diego_task = (select id from public.tasks where text = 'tarea de diego');
update fx set camila_deal = (select min(id) from public.deals where sales_id = (select camila from fx)),
              camila_contact = (select min(id) from public.contacts where sales_id = (select camila from fx));
grant select on fx to authenticated;

-- Ejecutivo --------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.deal_notes where id = (select diego_note from fx)), 0::bigint, 'ejecutivo no ve las notas de un lead ajeno');
select throws_ok(format('insert into public.deal_notes (deal_id, text, date) values (%s, %L, now())', (select diego_deal from fx), 'intrusa'), '42501', null, 'ejecutivo no comenta un lead ajeno');
select lives_ok(format('insert into public.deal_notes (deal_id, text, date) values (%s, %L, now())', (select camila_deal from fx), 'propia'), 'ejecutivo comenta su propio lead');
select is(pg_temp.exec_count(format('update public.deal_notes set text = %L where id = %s', 'x', (select diego_note from fx))), 0::bigint, 'ejecutivo no edita notas ajenas');
select is((select count(*) from public.tasks where id = (select diego_task from fx)), 0::bigint, 'ejecutivo no ve las tareas de un contacto ajeno');
select throws_ok(format('insert into public.tasks (contact_id, type, text, due_date) values (%s, %L, %L, now())', (select diego_contact from fx), 'call', 'intrusa'), '42501', null, 'ejecutivo no crea tareas sobre un contacto ajeno');
select lives_ok(format('insert into public.tasks (contact_id, type, text, due_date) values (%s, %L, %L, now())', (select camila_contact from fx), 'call', 'propia'), 'ejecutivo crea tareas sobre su contacto');
select is(pg_temp.exec_count(format('delete from public.tasks where text = %L', 'propia')), 1::bigint, 'ejecutivo borra su propia tarea');
select is((select count(*) from public.activity_log where type = 'deal.created'), (select count(*) from public.deals), 'activity_log solo lista los leads visibles');
select is((select count(*) from public.global_search('zebrafixture') where resource = 'deals'), 0::bigint, 'la búsqueda global no encuentra leads ajenos');
select is((select count(*) from public.contacts_summary where id = (select diego_contact from fx)), 0::bigint, 'contacts_summary no muestra contactos ajenos');

-- Lector -------------------------------------------------------------------
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.deal_notes where id = (select diego_note from fx)), 1::bigint, 'lector ve todas las notas');
select throws_ok(format('insert into public.deal_notes (deal_id, text, date) values (%s, %L, now())', (select diego_deal from fx), 'lector'), '42501', null, 'lector no comenta');
select throws_ok(format('insert into public.tasks (contact_id, type, text, due_date) values (%s, %L, %L, now())', (select diego_contact from fx), 'call', 'lector'), '42501', null, 'lector no crea tareas');
select is(pg_temp.exec_count(format('update public.tasks set text = %L where id = %s', 'x', (select diego_task from fx))), 0::bigint, 'lector no edita tareas');

-- Gerencia -----------------------------------------------------------------
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is(pg_temp.exec_count(format('update public.deal_notes set text = %L where id = %s', 'gerencia', (select diego_note from fx))), 1::bigint, 'gerencia edita cualquier nota');
select is((select count(*) from public.global_search('zebrafixture') where resource = 'deals'), 1::bigint, 'la búsqueda global sí encuentra el lead para gerencia');

select * from finish();
rollback;
