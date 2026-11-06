-- Reporte semanal (RF-12): weekly_report_data(week_start). Un caso por regla
-- (decisión de Ignacio, 2026-11-06), medido como diferencia antes/después de
-- insertar leads propios, para no depender de las fechas del seed:
--   ingresados   entradas = leads creados esa semana
--   cerrados     ganados y perdidos = cerrados esa semana por closed_at, hayan
--                ingresado cuando hayan ingresado
--   a la fecha   sin atender y vencidos = todos los que están así hoy, de
--                cualquier semana
-- La ejecutan gerencia con aal2 y service_role (n8n); el resto recibe 42501.
-- closed_at lo mantiene el trigger set_deal_closed_at.
begin;
select plan(18);

create function pg_temp.login_as(p_email text, p_aal text default 'aal2') returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Semana A: hace 20 a 14 días. Semana B: los últimos 7 días (termina hoy).
create temp table wk as
select (now() at time zone 'America/Santiago')::date - 20 as a,
       (now() at time zone 'America/Santiago')::date - 6 as b;
create temp table snap (moment text, week text, entries bigint, contacted bigint, quoted bigint, won bigint,
  won_amount bigint, lost bigint, lost_by_reason jsonb, unattended bigint, overdue_followups bigint);
grant select on wk to authenticated, service_role;
grant select, insert on snap to authenticated, service_role;

create function pg_temp.take_snapshot(p_moment text) returns void language sql as $$
  insert into snap select p_moment, 'A', r.* from wk, public.weekly_report_data(wk.a) r;
  insert into snap select p_moment, 'B', r.* from wk, public.weekly_report_data(wk.b) r;
$$;
-- Diferencia después - antes de una semana, como texto "(entradas,ganados,monto,perdidos,sin atender,vencidos)".
create function pg_temp.delta(p_week text) returns text language sql as $$
  select (x.entries - o.entries, x.won - o.won, x.won_amount - o.won_amount, x.lost - o.lost,
          x.unattended - o.unattended, x.overdue_followups - o.overdue_followups)::text
  from snap o join snap x on x.week = o.week
  where o.week = p_week and o.moment = 'antes' and x.moment = 'despues'
$$;
create function pg_temp.reason_count(p_moment text, p_week text, p_reason text) returns bigint language sql as $$
  select coalesce((select (e ->> 'count')::bigint
    from snap s, jsonb_array_elements(s.lost_by_reason) e
    where s.moment = p_moment and s.week = p_week and e ->> 'reason' = p_reason), 0)
$$;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select pg_temp.take_snapshot('antes');
reset role;

-- Leads propios (como postgres). Los tres primeros ingresan en la semana A.
create temp table fx as
with reason as (select id, name from public.lost_reasons order by position limit 1),
won_b as (
  insert into public.deals (name, stage, created_at, won_amount, closed_at)
  values ('Ganado en B', 'ganado', now() - interval '18 days', 1234567, now() - interval '2 days') returning id),
lost_b as (
  insert into public.deals (name, stage, created_at, lost_reason_id, closed_at)
  select 'Perdido en B', 'perdido', now() - interval '18 days', reason.id, now() - interval '2 days' from reason returning id),
won_a as (
  insert into public.deals (name, stage, created_at, won_amount, closed_at)
  values ('Ganado en A', 'ganado', now() - interval '18 days', 999, now() - interval '15 days') returning id),
unattended as (
  insert into public.deals (name, stage, created_at)
  values ('Sin atender hace 40 días', 'nuevo', now() - interval '40 days') returning id)
select won_b.id as won_b, lost_b.id as lost_b, won_a.id as won_a, unattended.id as unattended, reason.name as reason
from won_b, lost_b, won_a, unattended, reason;
insert into public.followups (deal_id, step, scheduled_at, channels, status)
select unattended, 1, now() - interval '40 days', '{correo}', 'vencido' from fx;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select pg_temp.take_snapshot('despues');
reset role;

-- (a) cerrados en la semana por fecha de cierre ---------------------------------
select is(pg_temp.delta('B'), '(0,1,1234567,1,1,1)',
  'semana B: los cerrados en ella cuentan como ganado (con su monto) y perdido aunque ingresaron en A');
select is(pg_temp.delta('A'), '(3,1,999,0,1,1)',
  'semana A: los tres ingresan en ella, pero solo cuenta como ganado el que se cerró en A');
select is(pg_temp.reason_count('despues', 'B', (select reason from fx)) - pg_temp.reason_count('antes', 'B', (select reason from fx)),
  1::bigint, 'semana B: el perdido aparece bajo su motivo');
select is(pg_temp.reason_count('despues', 'A', (select reason from fx)), pg_temp.reason_count('antes', 'A', (select reason from fx)),
  'semana A: el perdido en B no suma a los motivos');
select is((select sum((e ->> 'count')::bigint)::bigint from snap s, jsonb_array_elements(s.lost_by_reason) e
            where s.moment = 'despues' and s.week = 'B'),
  (select lost from snap where moment = 'despues' and week = 'B'), 'los motivos suman los perdidos de la semana');

-- (b) a la fecha, de cualquier semana ---------------------------------------------
-- El lead de hace 40 días y su seguimiento ya sumaron 1 en A y en B (deltas de arriba).
select is((select array_agg(distinct unattended) from snap where moment = 'despues'),
  array[(select count(*) from public.deals where stage = 'nuevo' and first_response_at is null
           and created_at <= now() - interval '24 hours')],
  'sin atender: todos los leads nuevos sin contacto con más de 24 h, igual en cualquier semana');
select is((select array_agg(distinct overdue_followups) from snap where moment = 'despues'),
  array[(select count(*) from public.followups where status = 'vencido')],
  'vencidos: todos los seguimientos vencidos, igual en cualquier semana');

-- (c) quién la ejecuta: gerencia con aal2 y service_role (n8n) ---------------------
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('role', 'service_role', true);
select results_eq(
  'select r.* from wk, public.weekly_report_data(wk.b) r',
  $$select entries, contacted, quoted, won, won_amount, lost, lost_by_reason, unattended, overdue_followups
      from snap where moment = 'despues' and week = 'B'$$,
  'service_role (n8n) la ejecuta y recibe lo mismo que gerencia');
reset role;

-- Recién ahora, para no mover las entradas de la semana B comparadas arriba.
insert into public.deals (name, stage) values ('Nuevo de hace un rato', 'nuevo');
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select unattended from wk, public.weekly_report_data(wk.b)),
  (select unattended from snap where moment = 'despues' and week = 'B'),
  'un lead nuevo con menos de 24 h todavía no está sin atender');
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'ejecutivo: 42501');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'lector: 42501');
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl', 'aal1');
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'gerencia sin aal2: 42501');
reset role;

select set_config('request.jwt.claims', '', true);
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'sin JWT (conexión directa): 42501');

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok('select * from public.weekly_report_data(null)', '22023', null, 'week_start nulo: 22023');
reset role;

select ok(not has_function_privilege('anon', 'public.weekly_report_data(date)', 'execute')
  and has_function_privilege('authenticated', 'public.weekly_report_data(date)', 'execute')
  and has_function_privilege('service_role', 'public.weekly_report_data(date)', 'execute'),
  'anon no ejecuta weekly_report_data; authenticated y service_role sí');

-- (d) closed_at lo mantiene el trigger ----------------------------------------------
select set_config('request.jwt.claims', '', true);
update public.deals set stage = 'ganado', won_amount = 500000 where id = (select unattended from fx);
select ok((select closed_at >= now() - interval '1 minute' from public.deals where id = (select unattended from fx)),
  'cerrar un lead fija closed_at en ese momento');
update public.deals set amount = 600000 where id = (select won_a from fx);
select is((select closed_at::date from public.deals where id = (select won_a from fx)), (now() - interval '15 days')::date,
  'editar un lead cerrado sin cambiar la etapa no mueve closed_at');
update public.deals set stage = 'cotizado' where id = (select won_a from fx);
select is((select closed_at from public.deals where id = (select won_a from fx)), null,
  'reabrir un lead borra closed_at');

select * from finish();
rollback;
