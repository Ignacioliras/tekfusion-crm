-- Dashboard por día (RF-11): cada métrica de dashboard_daily cuadra con el
-- cálculo a mano sobre deals/quotes del seed; respeta la RLS (security_invoker)
-- y anon no la lee.
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
  (select count(*) from public.deals) as leads,
  (select count(*) from public.deals where stage <> 'nuevo' or first_response_at is not null) as contacted,
  (select count(*) from public.deals d where d.stage = 'cotizado' or exists (select 1 from public.quotes q where q.deal_id = d.id)) as quoted,
  (select count(*) from public.deals where stage = 'ganado') as won,
  (select count(*) from public.deals where stage = 'perdido') as lost,
  (select count(*) from public.deals where stage = 'archivado') as archived,
  (select count(*) from public.deals where first_response_at is not null) as responded,
  (select count(*) from public.deals where first_response_at - created_at <= interval '24 hours') as within_24h,
  (select round(avg(extract(epoch from first_response_at - created_at) / 3600)::numeric, 2) from public.deals where first_response_at is not null) as avg_hours,
  (select coalesce(sum(amount), 0) from public.quotes where is_current) as quoted_amount,
  (select coalesce(sum(won_amount), 0) from public.deals) as won_amount,
  (select count(distinct ((created_at at time zone 'America/Santiago')::date, business_line, origin_channel)) from public.deals) as groups;
grant select on expected to authenticated;

select ok((select leads from expected) > 0 and (select won from expected) > 0 and (select quoted_amount from expected) > 0,
  'el seed trae leads, ganados y cotizaciones vigentes');

-- (a) gerencia: sumas de la vista = tablas base --------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from public.dashboard_daily), (select groups from expected), 'una fila por (día, línea, canal)');
select is((select sum(leads)::bigint from public.dashboard_daily), (select leads from expected), 'leads = count(*) de deals');
select is((select sum(contacted)::bigint from public.dashboard_daily), (select contacted from expected), 'contacted = etapa distinta de nuevo o con primera respuesta');
select is((select sum(quoted)::bigint from public.dashboard_daily), (select quoted from expected), 'quoted = en cotizado o con alguna cotización');
select is((select sum(won)::bigint from public.dashboard_daily), (select won from expected), 'won = count de ganado');
select is((select sum(lost)::bigint from public.dashboard_daily), (select lost from expected), 'lost = count de perdido');
select is((select sum(archived)::bigint from public.dashboard_daily), (select archived from expected), 'archived = count de archivado');
select is((select sum(responded)::bigint from public.dashboard_daily), (select responded from expected), 'responded = count con first_response_at');
select is((select sum(first_response_within_24h)::bigint from public.dashboard_daily), (select within_24h from expected), 'first_response_within_24h = respondidos en 24 h');
select is((select round(sum(avg_first_response_hours * responded) / sum(responded), 2) from public.dashboard_daily),
  (select avg_hours from expected), 'avg_first_response_hours ponderado = promedio de horas a la primera respuesta');
select is((select sum(quoted_amount)::bigint from public.dashboard_daily), (select quoted_amount::bigint from expected), 'quoted_amount = suma de las cotizaciones vigentes');
select is((select sum(won_amount)::bigint from public.dashboard_daily), (select won_amount::bigint from expected), 'won_amount = suma de deals.won_amount');
reset role;

-- (b) ejecutivo: solo agrega lo que ve bajo su RLS ---------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select ok((select count(*) from public.deals) < (select leads from expected), 'Camila ve menos leads que gerencia');
select is((select sum(leads)::bigint from public.dashboard_daily), (select count(*) from public.deals),
  'ejecutivo: la vista suma solo los leads que ve (suyos y sin asignar)');
reset role;

-- (c) security_invoker y (d) grants ---------------------------------------------------
select is(
  (select option_value from pg_class c join pg_namespace n on n.oid = c.relnamespace, pg_options_to_table(c.reloptions)
    where n.nspname = 'public' and c.relname = 'dashboard_daily' and option_name = 'security_invoker'),
  'on', 'dashboard_daily es security_invoker');
select ok(not has_table_privilege('anon', 'public.dashboard_daily', 'select')
  and has_table_privilege('authenticated', 'public.dashboard_daily', 'select'),
  'anon no lee dashboard_daily; authenticated sí');

select * from finish();
rollback;
