-- Dashboard view (Fase 6, RF-11). Written by hand from
-- supabase/schemas/13_tekfusion_dashboard.sql: no db diff ghosts (pgjwt,
-- views recreated without security_invoker) and the grants db diff skips.

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

revoke all on table public.dashboard_monthly from anon, public, authenticated;
grant select on table public.dashboard_monthly to authenticated, service_role;
