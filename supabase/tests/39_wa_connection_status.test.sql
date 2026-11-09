-- Indicador de conexión de WhatsApp (docs/07): wa_connection_status().
-- La llama cualquier usuario logueado (gerencia, ejecutivo, lector); anon y el
-- service role no. Devuelve solo connected y updated_at: nunca last_event, que
-- guarda cuerpos crudos de Evolution (con su apikey). La tabla
-- wa_instance_status sigue cerrada para authenticated (42501).
-- Sin filas: connected false y updated_at null. Con varias: la más reciente.
-- Seed: una instancia ('tekfusion-demo') conectada.
begin;
select plan(19);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Un last_event con un secreto reconocible: no debe salir por ningún lado.
update public.wa_instance_status
   set last_event = '{"event": "connection.update", "apikey": "SECRETO-DEMO-T39"}'::jsonb;

-- Lo que la función tiene que devolver, leído como postgres.
create temp table expected as
  select connected, updated_at from public.wa_instance_status where instance = 'tekfusion-demo';
grant select on expected to authenticated;

-- Definición y permisos ---------------------------------------------------------
select ok((select prosecdef and proconfig = array['search_path=""']
             from pg_proc where oid = 'public.wa_connection_status()'::regprocedure),
  'es security definer con search_path vacío');
select ok(has_function_privilege('authenticated', 'public.wa_connection_status()', 'execute')
      and not has_function_privilege('anon', 'public.wa_connection_status()', 'execute')
      and not has_function_privilege('service_role', 'public.wa_connection_status()', 'execute'),
  'wa_connection_status solo la ejecuta authenticated');
select is((select array_agg(a.name::text order by a.ord)
             from pg_proc p, unnest(p.proargnames) with ordinality a (name, ord)
            where p.oid = 'public.wa_connection_status()'::regprocedure),
  array['connected', 'updated_at'], 'devuelve solo connected y updated_at');

-- Los tres roles la llaman; la tabla sigue cerrada --------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select results_eq('select * from public.wa_connection_status()', 'select * from expected',
  'gerencia lee el estado de conexión');
select is((select connected from public.wa_connection_status()), true, 'gerencia ve WhatsApp conectado');
select ok((select to_jsonb(t)::text not like '%SECRETO-DEMO-T39%' from public.wa_connection_status() t),
  'la respuesta no trae nada de last_event');
select throws_ok('select count(*) from public.wa_instance_status', '42501', null,
  'gerencia sigue sin leer wa_instance_status');
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select results_eq('select * from public.wa_connection_status()', 'select * from expected',
  'el ejecutivo lee el estado de conexión');
select throws_ok('select count(*) from public.wa_instance_status', '42501', null,
  'el ejecutivo sigue sin leer wa_instance_status');
select throws_ok('select last_event from public.wa_instance_status', '42501', null,
  'el ejecutivo no lee last_event');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select results_eq('select * from public.wa_connection_status()', 'select * from expected',
  'el lector lee el estado de conexión');
select throws_ok('select count(*) from public.wa_instance_status', '42501', null,
  'el lector sigue sin leer wa_instance_status');
reset role;

-- Anon y service role ------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select throws_ok('select * from public.wa_connection_status()', '42501', null,
  'anon no lee el estado de conexión');
reset role;

select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select throws_ok('select * from public.wa_connection_status()', '42501', null,
  'el service role no usa la función (lee la tabla)');
reset role;

-- Desconectado, varias instancias y sin filas ------------------------------------
select public.wa_upsert_instance_status('tekfusion-demo', false, '{"state": "close"}'::jsonb);
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select connected from public.wa_connection_status()), false,
  'tras un connection.update de cierre, el ejecutivo ve desconectado');
reset role;

-- Una instancia antigua que quedó "conectada" no tapa a la actual.
insert into public.wa_instance_status (instance, connected, updated_at)
  values ('instancia-antigua-t39', true, now() - interval '3 days');
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.wa_connection_status()), 1::bigint, 'con dos instancias devuelve una sola fila');
select is((select connected from public.wa_connection_status()), false, 'manda la instancia actualizada más recientemente');
reset role;

delete from public.wa_instance_status;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.wa_connection_status()), 1::bigint, 'sin filas igual devuelve una fila');
select ok((select not connected and updated_at is null from public.wa_connection_status()),
  'sin filas: desconectado y sin fecha');
reset role;

select * from finish();
rollback;
