-- Ranking de ejecutivos (RF-11): como gerencia, cada fila de sales_ranking
-- cuadra con el cálculo a mano sobre deals/quotes/send_queue del seed; como
-- ejecutivo y como lector la vista devuelve cero filas; security_invoker; anon
-- no la lee.
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

-- Cálculo a mano (como postgres, sin RLS: es lo que gerencia debe ver).
create temp table expected as
select
  (d.created_at at time zone 'America/Santiago')::date as day,
  d.sales_id,
  count(*) as leads,
  count(*) filter (where d.first_response_at is not null) as leads_attended,
  round(avg(extract(epoch from d.first_response_at - d.created_at) / 3600)::numeric, 2) as avg_first_response_hours,
  coalesce(sum((select count(*) from public.quotes q
                where q.deal_id = d.id
                  and (cardinality(q.sent_channels) > 0
                       or exists (select 1 from public.send_queue sq where sq.quote_id = q.id)))), 0)::bigint as quotes_sent,
  count(*) filter (where d.stage = 'ganado') as won,
  coalesce(sum(d.won_amount), 0)::bigint as won_amount,
  count(*) filter (where d.stage = 'perdido') as lost
from public.deals d
where d.sales_id is not null
group by 1, 2;
grant select on expected to authenticated;

select ok((select count(*) from expected) > 0
  and (select sum(won) from expected) > 0
  and (select sum(quotes_sent) from expected) > 0
  and exists (select 1 from public.deals where sales_id is null),
  'el seed trae leads con dueño, ganados, cotizaciones enviadas y leads sin asignar');

-- (a) gerencia: la vista completa = cálculo a mano ------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select results_eq(
  'select day, sales_id, leads, leads_attended, avg_first_response_hours, quotes_sent, won, won_amount, lost from public.sales_ranking order by day, sales_id',
  'select day, sales_id, leads, leads_attended, avg_first_response_hours, quotes_sent, won, won_amount, lost from expected order by day, sales_id',
  'gerencia: cada fila (mes, ejecutivo) cuadra con el cálculo a mano');
select is((select count(*) from public.sales_ranking where sales_id is null), 0::bigint, 'los leads sin asignar quedan fuera');

-- Totales por ejecutivo (criterio de aceptación: leads, ganados, monto, cotizaciones).
select is((select sum(leads)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl'),
  (select count(*) from public.deals d join public.sales s on s.id = d.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl'),
  'Camila: leads = sus deals');
select is((select sum(won)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl'),
  (select count(*) from public.deals d join public.sales s on s.id = d.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl' and d.stage = 'ganado'),
  'Camila: won = sus deals ganados');
select is((select sum(won_amount)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl'),
  (select coalesce(sum(d.won_amount), 0)::bigint from public.deals d join public.sales s on s.id = d.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl'),
  'Camila: won_amount = suma de won_amount de sus deals');
select is((select sum(quotes_sent)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'camila.rojas@tekfusion-demo.cl'),
  (select count(*) from public.quotes q join public.deals d on d.id = q.deal_id join public.sales s on s.id = d.sales_id
    where s.email = 'camila.rojas@tekfusion-demo.cl'
      and (cardinality(q.sent_channels) > 0 or exists (select 1 from public.send_queue sq where sq.quote_id = q.id))),
  'Camila: quotes_sent = cotizaciones enviadas de sus leads');
select is((select sum(leads)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl'),
  (select count(*) from public.deals d join public.sales s on s.id = d.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl'),
  'Diego: leads = sus deals');
select is((select sum(won)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl'),
  (select count(*) from public.deals d join public.sales s on s.id = d.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl' and d.stage = 'ganado'),
  'Diego: won = sus deals ganados');
select is((select sum(won_amount)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl'),
  (select coalesce(sum(d.won_amount), 0)::bigint from public.deals d join public.sales s on s.id = d.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl'),
  'Diego: won_amount = suma de won_amount de sus deals');
select is((select sum(quotes_sent)::bigint from public.sales_ranking r join public.sales s on s.id = r.sales_id where s.email = 'diego.munoz@tekfusion-demo.cl'),
  (select count(*) from public.quotes q join public.deals d on d.id = q.deal_id join public.sales s on s.id = d.sales_id
    where s.email = 'diego.munoz@tekfusion-demo.cl'
      and (cardinality(q.sent_channels) > 0 or exists (select 1 from public.send_queue sq where sq.quote_id = q.id))),
  'Diego: quotes_sent = cotizaciones enviadas de sus leads');
reset role;

-- (b) ejecutivo y lector: cero filas aunque su RLS les deje ver deals -----------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select ok((select count(*) from public.deals) > 0, 'Camila ve deals bajo su RLS');
select is((select count(*) from public.sales_ranking), 0::bigint, 'ejecutivo: cero filas del ranking');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select ok((select count(*) from public.deals) > 0, 'Pablo (lector) ve deals bajo su RLS');
select is((select count(*) from public.sales_ranking), 0::bigint, 'lector: cero filas del ranking');
reset role;

-- (c) security_invoker y (d) grants ---------------------------------------------------
select is(
  (select option_value from pg_class c join pg_namespace n on n.oid = c.relnamespace, pg_options_to_table(c.reloptions)
    where n.nspname = 'public' and c.relname = 'sales_ranking' and option_name = 'security_invoker'),
  'on', 'sales_ranking es security_invoker');
select ok(not has_table_privilege('anon', 'public.sales_ranking', 'select')
  and has_table_privilege('authenticated', 'public.sales_ranking', 'select'),
  'anon no lee sales_ranking; authenticated sí');

select * from finish();
rollback;
