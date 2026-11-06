--
-- TekFusion dashboard (Fase 6, RF-11). "vista_dashboard_mensual" of docs/05,
-- by day since 2026-11-05 (free date range in the dashboard, docs/10).
-- security_invoker: the view aggregates only the deals (and quotes) the
-- caller can read, so an executive gets their own leads plus the unassigned
-- ones; managers and readers get everything.
--
-- One row per (day, business_line, origin_channel). Archived leads count as
-- archived; nothing is excluded. Metrics (also in docs/05, "Vistas"):
--   day                      calendar day of created_at in America/Santiago
--   leads                    count of deals
--   contacted                stage <> 'nuevo' or first_response_at not null
--   quoted                   stage = 'cotizado' or at least one quote (a closed lead
--                            counts as quoted only if it has a quote)
--   won / lost / archived    stage = 'ganado' / 'perdido' / 'archivado'
--   responded                first_response_at not null
--   first_response_within_24h  first_response_at - created_at <= 24 h
--   avg_first_response_hours   avg(first_response_at - created_at) in hours, 2 decimals;
--                            leads without first_response_at are left out (null if none)
--   quoted_amount            sum of the current quote (quotes.is_current) of each lead, CLP
--   won_amount               sum of deals.won_amount, CLP
--
create or replace view public.dashboard_daily with (security_invoker = on) as
with lead_quotes as (
    select deal_id,
           count(*) as quote_count,
           sum(amount) filter (where is_current) as current_amount
    from public.quotes
    group by deal_id
)
select
    (d.created_at at time zone 'America/Santiago')::date as day,
    d.business_line,
    d.origin_channel,
    count(*) as leads,
    count(*) filter (where d.stage <> 'nuevo' or d.first_response_at is not null) as contacted,
    count(*) filter (where d.stage = 'cotizado' or lq.quote_count > 0) as quoted,
    count(*) filter (where d.stage = 'ganado') as won,
    count(*) filter (where d.stage = 'perdido') as lost,
    count(*) filter (where d.stage = 'archivado') as archived,
    count(*) filter (where d.first_response_at is not null) as responded,
    count(*) filter (where d.first_response_at - d.created_at <= interval '24 hours') as first_response_within_24h,
    (avg(extract(epoch from d.first_response_at - d.created_at) / 3600))::numeric(10, 2) as avg_first_response_hours,
    coalesce(sum(lq.current_amount), 0)::bigint as quoted_amount,
    coalesce(sum(d.won_amount), 0)::bigint as won_amount
from public.deals d
    left join lead_quotes lq on lq.deal_id = d.id
group by 1, 2, 3;

-- Grants by hand (db diff does not emit them): default privileges would give
-- authenticated everything (TRIGGER included) and anon has no business here.
revoke all on table public.dashboard_daily from anon, public, authenticated;
grant select on table public.dashboard_daily to authenticated, service_role;

--
-- Executive ranking (RF-11). "vista_ranking_ejecutivos" of docs/05.
-- Managers only: the RLS of deals lets a reader see everything, so the view
-- itself filters on is_manager() and executives / readers get zero rows.
-- security_invoker so the subqueries still go through RLS for the caller.
--
-- One row per (day, sales_id) over the deals that have an owner. Metrics:
--   day                      calendar day of created_at in America/Santiago
--   sales_id                 the executive (owner of the lead)
--   leads                    count of deals
--   leads_attended           first_response_at not null
--   avg_first_response_hours avg(first_response_at - created_at) in hours, 2 decimals
--                            (null if none attended)
--   quotes_sent              quotes of those leads that were sent: sent_channels not
--                            empty or a row in send_queue
--   won / lost               stage = 'ganado' / 'perdido'
--   won_amount               sum of deals.won_amount, CLP
--
create or replace view public.sales_ranking with (security_invoker = on) as
with sent_quotes as (
    select q.deal_id, count(*) as sent_count
    from public.quotes q
    where cardinality(q.sent_channels) > 0
       or exists (select 1 from public.send_queue sq where sq.quote_id = q.id)
    group by q.deal_id
)
select
    (d.created_at at time zone 'America/Santiago')::date as day,
    d.sales_id,
    count(*) as leads,
    count(*) filter (where d.first_response_at is not null) as leads_attended,
    (avg(extract(epoch from d.first_response_at - d.created_at) / 3600))::numeric(10, 2) as avg_first_response_hours,
    coalesce(sum(sq.sent_count), 0)::bigint as quotes_sent,
    count(*) filter (where d.stage = 'ganado') as won,
    coalesce(sum(d.won_amount), 0)::bigint as won_amount,
    count(*) filter (where d.stage = 'perdido') as lost
from public.deals d
    left join sent_quotes sq on sq.deal_id = d.id
where (select public.is_manager())
  and d.sales_id is not null
group by 1, 2;

revoke all on table public.sales_ranking from anon, public, authenticated;
grant select on table public.sales_ranking to authenticated, service_role;

--
-- Range totals summed in the database (docs/10, 2026-11-05): the dashboard
-- never fetches day rows, so no range hits PostgREST max_rows (1000).
-- Security invoker over the views above: same RLS, and executives / readers
-- get zero ranking rows. Both dates inclusive; averages weighted by
-- responded / leads_attended.
-- dashboard_summary: one row per (month, business_line, origin_channel), month
-- being the first day of the month (at most months x 4 lines x 6 channels).
--
CREATE OR REPLACE FUNCTION "public"."dashboard_summary"("date_from" "date", "date_to" "date") RETURNS TABLE("month" "date", "business_line" "public"."business_line", "origin_channel" "public"."origin_channel", "leads" bigint, "contacted" bigint, "quoted" bigint, "won" bigint, "lost" bigint, "archived" bigint, "responded" bigint, "first_response_within_24h" bigint, "avg_first_response_hours" numeric, "quoted_amount" bigint, "won_amount" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select
    date_trunc('month', dd.day::timestamp)::date,
    dd.business_line,
    dd.origin_channel,
    sum(dd.leads)::bigint,
    sum(dd.contacted)::bigint,
    sum(dd.quoted)::bigint,
    sum(dd.won)::bigint,
    sum(dd.lost)::bigint,
    sum(dd.archived)::bigint,
    sum(dd.responded)::bigint,
    sum(dd.first_response_within_24h)::bigint,
    round(sum(dd.avg_first_response_hours * dd.responded) / nullif(sum(dd.responded), 0), 2),
    sum(dd.quoted_amount)::bigint,
    sum(dd.won_amount)::bigint
  from public.dashboard_daily dd
  where dd.day between date_from and date_to
  group by 1, 2, 3
$$;

-- sales_ranking_summary: one row per executive.
CREATE OR REPLACE FUNCTION "public"."sales_ranking_summary"("date_from" "date", "date_to" "date") RETURNS TABLE("sales_id" bigint, "leads" bigint, "leads_attended" bigint, "avg_first_response_hours" numeric, "quotes_sent" bigint, "won" bigint, "won_amount" bigint, "lost" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select
    r.sales_id,
    sum(r.leads)::bigint,
    sum(r.leads_attended)::bigint,
    round(sum(r.avg_first_response_hours * r.leads_attended) / nullif(sum(r.leads_attended), 0), 2),
    sum(r.quotes_sent)::bigint,
    sum(r.won)::bigint,
    sum(r.won_amount)::bigint,
    sum(r.lost)::bigint
  from public.sales_ranking r
  where r.day between date_from and date_to
  group by r.sales_id
$$;

-- Grants here, not in 12_tekfusion_grants.sql: schema files load in
-- alphabetical order and 12_ runs before these functions exist.
revoke execute on function public.dashboard_summary(date, date) from public, anon;
grant execute on function public.dashboard_summary(date, date) to authenticated, service_role;
revoke execute on function public.sales_ranking_summary(date, date) from public, anon;
grant execute on function public.sales_ranking_summary(date, date) to authenticated, service_role;
