--
-- TekFusion dashboard (Fase 6, RF-11). "vista_dashboard_mensual" of docs/05.
-- security_invoker: the view aggregates only the deals (and quotes) the
-- caller can read, so an executive gets their own leads plus the unassigned
-- ones; managers and readers get everything.
--
-- One row per (month, business_line, origin_channel). Archived leads count as
-- archived; nothing is excluded. Metrics (also in docs/05, "Vistas"):
--   month                    first day of the month of created_at in America/Santiago
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
create or replace view public.dashboard_monthly with (security_invoker = on) as
with lead_quotes as (
    select deal_id,
           count(*) as quote_count,
           sum(amount) filter (where is_current) as current_amount
    from public.quotes
    group by deal_id
)
select
    (date_trunc('month', d.created_at at time zone 'America/Santiago'))::date as month,
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
revoke all on table public.dashboard_monthly from anon, public, authenticated;
grant select on table public.dashboard_monthly to authenticated, service_role;

--
-- Executive ranking (RF-11). "vista_ranking_ejecutivos" of docs/05.
-- Managers only: the RLS of deals lets a reader see everything, so the view
-- itself filters on is_manager() and executives / readers get zero rows.
-- security_invoker so the subqueries still go through RLS for the caller.
--
-- One row per (month, sales_id) over the deals that have an owner. Metrics:
--   month                    first day of the month of created_at in America/Santiago
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
    (date_trunc('month', d.created_at at time zone 'America/Santiago'))::date as month,
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
