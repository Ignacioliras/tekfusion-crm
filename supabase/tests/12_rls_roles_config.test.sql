-- Roles (sales.role), columnas protegidas y tablas de configuración.
-- docs/08 "perfiles" y "configuracion…": todos leen, gerencia escribe;
-- role/administrator/disabled solo los cambia gerencia (decisión 2).
begin;
select plan(22);

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
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  (select id from public.sales where email = 'pablo.herrera@tekfusion-demo.cl') as pablo;
grant select on fx to authenticated;

-- Sincronización role <-> administrator (como postgres, sin RLS) -----------
select is((select role from public.sales where email = 'andrea.soto@tekfusion-demo.cl'), 'manager'::public.user_role, 'el primer usuario (administrator) queda como manager');
-- Alta por la vía real: invitación + auth.users dispara handle_new_user, que crea la fila en sales.
insert into public.user_invitations (user_id) values ('a0000000-0000-4000-8000-00000000ffff');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-00000000ffff', 'authenticated', 'authenticated', 'nuevo@tekfusion-demo.cl', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Nuevo","last_name":"Usuario"}'::jsonb, now(), now(), '', '', '', '');
select is((select role from public.sales where email = 'nuevo@tekfusion-demo.cl'), 'executive'::public.user_role, 'un usuario nuevo nace executive');
update public.sales set administrator = true where email = 'nuevo@tekfusion-demo.cl';
select is((select role from public.sales where email = 'nuevo@tekfusion-demo.cl'), 'manager'::public.user_role, 'marcar administrator lo vuelve manager');
update public.sales set role = 'reader' where email = 'nuevo@tekfusion-demo.cl';
select is((select administrator from public.sales where email = 'nuevo@tekfusion-demo.cl'), false, 'cambiar el rol actualiza administrator');

-- Ejecutivo --------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.sales), (select count(*) from public.sales where true), 'ejecutivo ve la lista de usuarios');
select throws_ok(format('update public.sales set role = %L where id = %s', 'manager', (select camila from fx)), '42501', null, 'ejecutivo no se vuelve manager');
select throws_ok(format('update public.sales set administrator = true where id = %s', (select camila from fx)), '42501', null, 'ejecutivo no se marca administrator');
select throws_ok(format('update public.sales set disabled = true where id = %s', (select camila from fx)), '42501', null, 'ejecutivo no cambia disabled');
select is(pg_temp.exec_count(format('update public.sales set signature = %L where id = %s', '— Cami', (select camila from fx))), 1::bigint, 'ejecutivo edita su propia firma');
select is(pg_temp.exec_count(format('update public.sales set signature = %L where id = %s', 'x', (select diego from fx))), 0::bigint, 'ejecutivo no edita a otro usuario');
select is((select count(*) from public.configuration), 1::bigint, 'ejecutivo lee la configuración');
select is(pg_temp.exec_count('update public.configuration set config = config'), 0::bigint, 'ejecutivo no escribe la configuración');
select is((select count(*) from public.business_lines), 3::bigint, 'ejecutivo lee las líneas de negocio');
select throws_ok('insert into public.lost_reasons (name) values (''Ejecutivo'')', '42501', null, 'ejecutivo no crea motivos de pérdida');
select is(pg_temp.exec_count('update public.business_lines set name = name'), 0::bigint, 'ejecutivo no edita las líneas de negocio');

-- Lector -------------------------------------------------------------------
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.lost_reasons), 5::bigint, 'lector lee los motivos de pérdida');
select throws_ok('insert into public.sales_absences (sales_id, starts_on, ends_on) values (1, current_date, current_date)', '42501', null, 'lector no registra ausencias');

-- Gerencia -----------------------------------------------------------------
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select lives_ok(format('update public.sales set role = %L where id = %s', 'executive', (select pablo from fx)), 'gerencia cambia el rol de un usuario');
select lives_ok('insert into public.lost_reasons (name) values (''Gerencia'')', 'gerencia crea motivos de pérdida');
select is(pg_temp.exec_count('update public.business_lines set name = name'), 3::bigint, 'gerencia edita las líneas de negocio');
select lives_ok(format('update public.sales set disabled = true where id = %s', (select diego from fx)), 'gerencia desactiva usuarios');

-- Usuario desactivado ------------------------------------------------------
reset role;
select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select is((select count(*) from public.deals) + (select count(*) from public.sales), 0::bigint, 'un usuario desactivado no ve nada');

select * from finish();
rollback;
