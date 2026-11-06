-- Fase 6 (T1 de la cola nocturna 2026-11-06): el dashboard suma en la base
-- (docs/10, 2026-11-05) para que ningún rango choque con max_rows = 1000 de
-- PostgREST. Written by hand: db diff emits no grants on functions.
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

revoke execute on function public.dashboard_summary(date, date) from public, anon;
grant execute on function public.dashboard_summary(date, date) to authenticated, service_role;
revoke execute on function public.sales_ranking_summary(date, date) from public, anon;
grant execute on function public.sales_ranking_summary(date, date) to authenticated, service_role;
