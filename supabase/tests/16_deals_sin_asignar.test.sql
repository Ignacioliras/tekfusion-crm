-- Lead insertado sin dueño (docs/10, 2026-11-03, importador CSV): gerencia
-- puede dejarlo sin asignar; un ejecutivo queda como dueño (default de Atomic);
-- el service role (n8n, Edge Functions) lo deja sin asignar.
begin;
select plan(4);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Gerencia ------------------------------------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
insert into public.deals (name, stage, company_id) values ('pgtap gerencia sin dueño', 'nuevo', 1);
insert into public.deals (name, stage, company_id, sales_id)
  values ('pgtap gerencia para Camila', 'nuevo', 1, (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl'));
reset role;
select is((select sales_id from public.deals where name = 'pgtap gerencia sin dueño'), null::bigint,
  'gerencia puede crear un lead sin asignar');
select is((select sales_id from public.deals where name = 'pgtap gerencia para Camila'),
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl'),
  'gerencia asigna el lead a quien indica');

-- Ejecutivo -----------------------------------------------------------------
select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
insert into public.deals (name, stage, company_id) values ('pgtap ejecutivo sin dueño', 'nuevo', 1);
reset role;
select is((select sales_id from public.deals where name = 'pgtap ejecutivo sin dueño'),
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl'),
  'un ejecutivo que crea un lead sin dueño queda como dueño');

-- Service role ----------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
insert into public.deals (name, stage, company_id) values ('pgtap service role', 'nuevo', 1);
reset role;
select is((select sales_id from public.deals where name = 'pgtap service role'), null::bigint,
  'el service role deja el lead sin asignar');

select * from finish();
rollback;
