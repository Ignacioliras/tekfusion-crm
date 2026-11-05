-- Export CSV con autor (docs/08): solo gerencia exporta y cada export queda en
-- audit_log con quién, qué recurso, cuántas filas y con qué filtros.
begin;
select plan(7);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select lives_ok($$select public.log_export('deals', 42, '{"business_line": "valvulas"}')$$, 'gerencia registra un export');
reset role;
select is((select a.actor_sales_id from public.audit_log a where a.action = 'export'),
  (select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl'), 'queda con su autor');
select is((select a.details from public.audit_log a where a.action = 'export'),
  '{"resource": "deals", "rows": 42, "filters": {"business_line": "valvulas"}}'::jsonb, 'y con recurso, filas y filtros');

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok($$select public.log_export('alerts', 1, '{}')$$, '22023', null, 'un recurso desconocido se rechaza');
reset role;
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok($$select public.log_export('deals', 3, '{}')$$, '42501', null, 'un ejecutivo no exporta');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok($$select public.log_export('contacts', 3, '{}')$$, '42501', null, 'un lector no exporta');
reset role;
select ok(not has_function_privilege('anon', 'public.log_export(text, integer, jsonb)', 'execute'), 'anon no puede llamarla');

select * from finish();
rollback;
