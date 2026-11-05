-- fase-3/ajustes: the dashboard filters by a free date range (docs/10,
-- 2026-11-05): both views go from month to day. Written by hand: a column
-- rename needs drop + create, and db diff emits no grants.
drop view if exists public.dashboard_monthly;
drop view if exists public.sales_ranking;

create view public.dashboard_daily with (security_invoker = on) as
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


revoke all on table public.dashboard_daily from anon, public, authenticated;
grant select on table public.dashboard_daily to authenticated, service_role;


create view public.sales_ranking with (security_invoker = on) as
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
