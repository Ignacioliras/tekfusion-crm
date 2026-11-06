-- Reporte semanal (RF-12): weekly_report_data(week_start) cuadra con el cálculo
-- a mano sobre deals/quotes/followups del seed para cada semana posible; la
-- semana que termina hoy trae los valores fijos del seed; solo gerencia con
-- aal2 la ejecuta (ejecutivo, lector y gerencia sin TOTP reciben 42501).
begin;
select plan(11);

create function pg_temp.login_as(p_email text, p_aal text default 'aal2') returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Cálculo a mano, como postgres (sin RLS), para cada semana que toca el seed.
create temp table seed_deals as
select d.*, (d.created_at at time zone 'America/Santiago')::date as day from public.deals d;

create temp table weeks as
select gs::date as ws
from generate_series(
  (select min(day) from seed_deals) - 6,
  (now() at time zone 'America/Santiago')::date,
  interval '1 day') gs;

create temp table expected as
select w.ws,
  count(d.id) as entries,
  count(d.id) filter (where d.stage <> 'nuevo' or d.first_response_at is not null) as contacted,
  count(d.id) filter (where d.stage = 'cotizado' or exists (select 1 from public.quotes q where q.deal_id = d.id)) as quoted,
  count(d.id) filter (where d.stage = 'ganado') as won,
  coalesce(sum(d.won_amount), 0)::bigint as won_amount,
  count(d.id) filter (where d.stage = 'perdido') as lost,
  coalesce((select jsonb_agg(jsonb_build_object('reason', x.name, 'count', x.n) order by x.n desc, x.name)
     from (select lr.name, count(*) as n from seed_deals l join public.lost_reasons lr on lr.id = l.lost_reason_id
           where l.day >= w.ws and l.day < w.ws + 7 and l.stage = 'perdido' group by lr.name) x), '[]'::jsonb) as lost_by_reason,
  count(d.id) filter (where d.stage = 'nuevo' and d.first_response_at is null
                        and d.created_at <= now() - interval '24 hours') as unattended,
  (select count(*) from public.followups f where f.status = 'vencido'
     and (f.scheduled_at at time zone 'America/Santiago')::date >= w.ws
     and (f.scheduled_at at time zone 'America/Santiago')::date < w.ws + 7) as overdue_followups
from weeks w
    left join seed_deals d on d.day >= w.ws and d.day < w.ws + 7
group by w.ws;

grant select on weeks, expected to authenticated;

select ok((select sum(unattended) > 0 and sum(overdue_followups) > 0 and sum(won_amount) > 0
                  and sum(quoted) > 0 and bool_or(jsonb_array_length(lost_by_reason) > 1) from expected),
  'las semanas del seed cubren sin atender, vencidos, ganados, cotizados y varios motivos');

-- (a) gerencia con aal2: cada semana cuadra con el cálculo a mano -------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select results_eq(
  'select w.ws, r.* from weeks w cross join lateral public.weekly_report_data(w.ws) r order by w.ws',
  'select * from expected order by ws',
  'gerencia: cada semana del seed cuadra con deals, quotes y followups');

-- (b) la semana que termina hoy: valores fijos del seed -----------------------
-- Deals creados hace 4, 5 y 6 días (i = 53, 41, 29 del seed): los tres perdidos,
-- contactados a las 3 h; 3 seguimientos vencidos (ayer).
create temp table this_week as
select * from public.weekly_report_data((now() at time zone 'America/Santiago')::date - 6);
select is((select entries from this_week), 3::bigint, 'semana actual: 3 entradas');
select is((select (contacted, quoted, won, won_amount, lost, unattended)::text from this_week),
  '(3,0,0,0,3,0)', 'semana actual: 3 contactados, 0 cotizados, 0 ganados, 3 perdidos, 0 sin atender');
select is((select (select sum((e ->> 'count')::bigint) from jsonb_array_elements(lost_by_reason) e)::bigint from this_week),
  3::bigint, 'semana actual: los motivos suman los 3 perdidos');
select is((select overdue_followups from this_week), 3::bigint, 'semana actual: 3 seguimientos vencidos');
reset role;

-- (c) solo gerencia con aal2 ----------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'ejecutivo: 42501');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'lector: 42501');
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl', 'aal1');
select throws_ok('select * from public.weekly_report_data(current_date)', '42501', null, 'gerencia sin aal2: 42501');
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok('select * from public.weekly_report_data(null)', '22023', null, 'week_start nulo: 22023');
reset role;

-- (d) grants ---------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.weekly_report_data(date)', 'execute')
  and has_function_privilege('authenticated', 'public.weekly_report_data(date)', 'execute'),
  'anon no ejecuta weekly_report_data; authenticated sí');

select * from finish();
rollback;
