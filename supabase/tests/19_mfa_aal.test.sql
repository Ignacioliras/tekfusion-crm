-- Verificación en dos pasos exigida en la base (docs/08, revisión 2026-11-03):
-- una sesión de gerencia vale solo con aal2; un ejecutivo con factor también;
-- un ejecutivo sin factor sigue entrando con aal1. La propia fila de sales se
-- lee siempre (la app necesita el rol para mandar a /mfa/enroll).
begin;
select plan(8);

create function pg_temp.login_as(p_email text, p_aal text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create temp table fx as
select
  (select count(*) from public.deals) as total,
  (select count(*) from public.deals where sales_id = (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl')) as camila_total,
  (select count(*) from public.deals where sales_id is null) as free,
  (select user_id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila_uid;
grant select on fx to authenticated;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl', 'aal1');
select is((select count(*) from public.deals), 0::bigint, 'gerencia sin verificar (aal1) no ve ningún lead');
select is((select count(*) from public.sales where user_id = auth.uid()), 1::bigint, 'pero lee su propia fila de sales');
select is((select count(*) from public.sales), 1::bigint, 'y solo la suya');
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl', 'aal2');
select is((select count(*) from public.deals), (select total from fx), 'gerencia verificada (aal2) ve todo');
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl', 'aal1');
select is((select count(*) from public.deals), (select camila_total + free from fx), 'ejecutivo sin factor entra con aal1');
reset role;

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), (select camila_uid from fx), 'CRM TekFusion', 'totp', 'verified', now(), now(), 'x');
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl', 'aal1');
select is((select count(*) from public.deals), 0::bigint, 'ejecutivo con factor verificado exige aal2');
reset role;
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl', 'aal2');
select is((select count(*) from public.deals), (select camila_total + free from fx), 'ejecutivo con factor y aal2 ve sus leads');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl', 'aal1');
select is((select count(*) from public.deals), (select total from fx), 'lector sin factor entra con aal1');
reset role;

select * from finish();
rollback;
