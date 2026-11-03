-- Executive ranking view (Fase 6, RF-11). Written by hand from
-- supabase/schemas/13_tekfusion_dashboard.sql: no db diff ghosts (pgjwt,
-- views recreated without security_invoker) and the grants db diff skips.

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
