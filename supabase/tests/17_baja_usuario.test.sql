-- "Dar de baja" (docs/08, checklist): offboard_sale() desactiva, reasigna los
-- leads abiertos al suplente, traspasa las líneas, cierra sesiones y registra
-- en audit_log. El usuario dado de baja no ve nada. Seed: Diego (tuberías,
-- suplente Camila), Camila (válvulas y geoceldas, suplente Diego).
begin;
select plan(18);

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
  (select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl') as andrea,
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  (select user_id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego_uid,
  (select count(*) from public.deals where sales_id = (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl')
      and archived_at is null and stage in ('nuevo', 'contactado', 'cotizado')) as diego_open,
  (select count(*) from public.deals where sales_id = (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl')) as diego_total,
  (select count(*) from public.deals where sales_id = (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl')) as camila_total;
grant select on fx to authenticated, service_role;
-- Una sesión abierta de Diego, como la que deja un login.
insert into auth.sessions (id, user_id, created_at, updated_at) values (gen_random_uuid(), (select diego_uid from fx), now(), now());
select cmp_ok((select diego_open from fx), '>', 0::bigint, 'fixture: Diego tiene leads abiertos');

-- Quién puede: solo la Edge Function (service role), con el gerente como actor
create function pg_temp.as_service_role() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('role', 'service_role', true);
end $$;
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok(format('select public.offboard_sale(%s, %s)', (select diego from fx), (select camila from fx)), '42501', null, 'una sesión de API (ni siquiera gerencia) no llama offboard_sale');
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok(format('select public.offboard_sale(%s, %s)', (select diego from fx), (select andrea from fx)), '42501', null, 'gerencia tampoco la llama directo por PostgREST');
reset role;
select pg_temp.as_service_role();
select throws_ok(format('select public.offboard_sale(%s, %s)', (select andrea from fx), (select andrea from fx)), '42501', null, 'gerencia no se da de baja a sí misma');
select throws_ok(format('select public.offboard_sale(%s, %s)', (select diego from fx), (select camila from fx)), '42501', null, 'el actor debe ser un gerente activo');
select throws_ok(format('select public.offboard_sale(999999, %s)', (select andrea from fx)), 'P0002', null, 'usuario inexistente');

-- La baja de Diego, pedida por Andrea a través de la Edge Function -----------
select lives_ok(format('select public.offboard_sale(%s, %s)', (select diego from fx), (select andrea from fx)), 'gerencia da de baja a Diego');
reset role;
select is((select disabled from public.sales where id = (select diego from fx)), true, 'Diego queda desactivado');
select is((select count(*) from auth.sessions where user_id = (select diego_uid from fx)), 0::bigint, 'sus sesiones se cierran');
select is((select count(*) from public.deals where sales_id = (select diego from fx) and archived_at is null and stage in ('nuevo', 'contactado', 'cotizado')),
  0::bigint, 'no le queda ningún lead abierto');
select is((select count(*) from public.deals where sales_id = (select camila from fx)),
  (select camila_total + diego_open from fx), 'sus leads abiertos pasan a Camila, su suplente');
select is((select count(*) from public.deals where sales_id = (select diego from fx)),
  (select diego_total - diego_open from fx), 'sus leads cerrados y archivados conservan el dueño');
select is((select owner_sales_id from public.business_lines where code = 'tuberias'), (select camila from fx), 'su línea pasa a Camila');
select is((select count(*) from public.business_lines where substitute_sales_id = (select diego from fx)), 0::bigint, 'ya no es suplente de nadie');
select is((select count(*) from public.audit_log where action = 'sale.offboarded' and target_sales_id = (select diego from fx) and actor_sales_id = (select andrea from fx)),
  1::bigint, 'la baja queda registrada con quién la hizo');
select is((select count(*) from public.audit_log where action = 'deal.reassigned' and target_sales_id = (select diego from fx)),
  (select diego_open from fx), 'cada lead reasignado queda registrado');

-- Diego, con un JWT todavía vigente, no ve nada -----------------------------
select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select is((select count(*) from public.deals) + (select count(*) from public.contacts) + (select count(*) from public.companies) + (select count(*) from public.tasks),
  0::bigint, 'el usuario dado de baja no ve leads, contactos, empresas ni tareas');
reset role;
select pg_temp.as_service_role();
select throws_ok(format('select public.offboard_sale(%s, %s)', (select diego from fx), (select andrea from fx)), 'P0001', null, 'no se da de baja dos veces');
reset role;

select * from finish();
rollback;
