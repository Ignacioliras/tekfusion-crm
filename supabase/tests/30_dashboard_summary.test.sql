-- Dashboard sumado en la base (RF-11, docs/10 2026-11-05): dashboard_summary
-- y sales_ranking_summary cuadran con el cálculo a mano sobre deals/quotes del
-- seed; un rango de un día trae solo ese día; el ranking es solo de gerencia;
-- anon no ejecuta ninguna de las dos.
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

-- Rango completo del seed y un día con leads (como postgres, sin RLS).
create temp table seed_range as
select min(day) as date_from, max(day) as date_to,
       (select day from (select (created_at at time zone 'America/Santiago')::date as day from public.deals) x
        group by day order by count(*) desc, day limit 1) as one_day
from (select (created_at at time zone 'America/Santiago')::date as day from public.deals) d;
grant select on seed_range to authenticated;

-- Cálculo a mano por (mes, línea, canal), para el promedio ponderado.
create temp table expected_groups as
select date_trunc('month', (d.created_at at time zone 'America/Santiago')::date::timestamp)::date as month,
       d.business_line, d.origin_channel,
       round(avg(extract(epoch from d.first_response_at - d.created_at) / 3600)::numeric, 2) as avg_hours
from public.deals d
group by 1, 2, 3;
grant select on expected_groups to authenticated;

select ok((select date_from from seed_range) < (select date_to from seed_range), 'el seed abarca más de un día');

-- (a) gerencia: dashboard_summary sobre todo el rango = tablas base ------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
create temp table summary as
select * from public.dashboard_summary((select date_from from seed_range), (select date_to from seed_range));

select is((select sum(leads)::bigint from summary), (select count(*) from public.deals), 'leads = count(*) de deals');
select is((select sum(won)::bigint from summary), (select count(*) from public.deals where stage = 'ganado'), 'won = count de ganado');
select is((select sum(lost)::bigint from summary), (select count(*) from public.deals where stage = 'perdido'), 'lost = count de perdido');
select is((select sum(quoted_amount)::bigint from summary),
  (select coalesce(sum(amount), 0)::bigint from public.quotes where is_current), 'quoted_amount = suma de las cotizaciones vigentes');
select is((select sum(won_amount)::bigint from summary),
  (select coalesce(sum(won_amount), 0)::bigint from public.deals), 'won_amount = suma de deals.won_amount');
select is((select count(*) from summary),
  (select count(*) from expected_groups), 'una fila por (mes, línea, canal)');
select ok((select bool_and(month = date_trunc('month', month::timestamp)::date) from summary), 'month es el primer día del mes');
select is(
  (select count(*) from summary s join expected_groups e using (month, business_line, origin_channel)
    where s.avg_first_response_hours is not distinct from e.avg_hours),
  (select count(*) from expected_groups),
  'avg_first_response_hours ponderado por responded = promedio directo de cada grupo');

-- Últimos 12 meses (del primer día del mes de hace 11 meses a hoy): el seed
-- trae leads en cada uno de los 12 meses, con fechas relativas a now().
select is(
  (select count(distinct month) filter (where leads > 0)
     from public.dashboard_summary(
       (date_trunc('month', (now() at time zone 'America/Santiago')::date::timestamp) - interval '11 months')::date,
       (now() at time zone 'America/Santiago')::date)),
  12::bigint, 'últimos 12 meses: hay leads en cada uno de los 12 meses');

-- (b) un rango de un solo día trae solo lo de ese día --------------------------
select is(
  (select sum(leads)::bigint from public.dashboard_summary((select one_day from seed_range), (select one_day from seed_range))),
  (select count(*) from public.deals where (created_at at time zone 'America/Santiago')::date = (select one_day from seed_range)),
  'un día: leads = deals creados ese día');
select is(
  (select sum(won_amount)::bigint from public.dashboard_summary((select one_day from seed_range), (select one_day from seed_range))),
  (select coalesce(sum(won_amount), 0)::bigint from public.deals where (created_at at time zone 'America/Santiago')::date = (select one_day from seed_range)),
  'un día: won_amount = el de los deals de ese día');

-- (c) gerencia: sales_ranking_summary = suma de sales_ranking por ejecutivo ----
select ok((select count(*) from public.sales_ranking) > 0, 'gerencia ve filas del ranking');
select results_eq(
  format('select sales_id, leads, leads_attended, quotes_sent, won, won_amount, lost from public.sales_ranking_summary(%L, %L) order by sales_id',
    (select date_from from seed_range), (select date_to from seed_range)),
  'select sales_id, sum(leads)::bigint, sum(leads_attended)::bigint, sum(quotes_sent)::bigint, sum(won)::bigint, sum(won_amount)::bigint, sum(lost)::bigint
     from public.sales_ranking group by sales_id order by sales_id',
  'gerencia: cada ejecutivo cuadra con la suma de sales_ranking');
select results_eq(
  format('select sales_id, avg_first_response_hours from public.sales_ranking_summary(%L, %L) order by sales_id',
    (select date_from from seed_range), (select date_to from seed_range)),
  'select d.sales_id, round(avg(extract(epoch from d.first_response_at - d.created_at) / 3600)::numeric, 2)
     from public.deals d where d.sales_id is not null group by d.sales_id order by d.sales_id',
  'gerencia: promedio ponderado por leads_attended = promedio directo por ejecutivo');
reset role;

-- (d) ejecutivo y lector: cero filas del ranking --------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.sales_ranking_summary((select date_from from seed_range), (select date_to from seed_range))),
  0::bigint, 'ejecutivo: cero filas de sales_ranking_summary');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.sales_ranking_summary((select date_from from seed_range), (select date_to from seed_range))),
  0::bigint, 'lector: cero filas de sales_ranking_summary');
reset role;

-- (e) grants ---------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.dashboard_summary(date, date)', 'execute')
  and not has_function_privilege('anon', 'public.sales_ranking_summary(date, date)', 'execute')
  and has_function_privilege('authenticated', 'public.dashboard_summary(date, date)', 'execute')
  and has_function_privilege('authenticated', 'public.sales_ranking_summary(date, date)', 'execute'),
  'anon no ejecuta las funciones del dashboard; authenticated sí');

select * from finish();
rollback;
