--
-- Weekly report data (RF-12). n8n flow 09 (docs/06) reads it to build the
-- e-mail for management. Managers only (42501 otherwise, aal2 included via
-- is_manager()); security invoker so everything still goes through RLS.
--
-- The week is [week_start, week_start + 7) in America/Santiago, like
-- dashboard_daily.day. Same cohort as the dashboard (docs/06: "vista del
-- dashboard acotada a la semana"): the leads that entered that week.
--   entries / contacted / quoted / won / won_amount / lost
--                      summed from dashboard_daily (same definitions as 13_)
--   lost_by_reason     the week's lost leads per lost_reasons.name, as
--                      [{"reason", "count"}] ordered by count desc, then name
--   unattended         the week's leads still without contact once 24 h have
--                      gone by (docs/03 "Primer contacto"): stage 'nuevo', no
--                      first_response_at, created_at <= now() - 24 h. The
--                      negation of dashboard_daily.contacted.
--   overdue_followups  followups in status 'vencido' (docs/03) scheduled
--                      within the week
--
CREATE OR REPLACE FUNCTION "public"."weekly_report_data"("week_start" "date") RETURNS TABLE("entries" bigint, "contacted" bigint, "quoted" bigint, "won" bigint, "won_amount" bigint, "lost" bigint, "lost_by_reason" "jsonb", "unattended" bigint, "overdue_followups" bigint)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_manager() then
    raise exception 'only managers read the weekly report' using errcode = '42501';
  end if;
  if week_start is null then
    raise exception 'week_start is required' using errcode = '22023';
  end if;
  return query
  with totals as (
    select coalesce(sum(dd.leads), 0)::bigint as t_entries,
           coalesce(sum(dd.contacted), 0)::bigint as t_contacted,
           coalesce(sum(dd.quoted), 0)::bigint as t_quoted,
           coalesce(sum(dd.won), 0)::bigint as t_won,
           coalesce(sum(dd.won_amount), 0)::bigint as t_won_amount,
           coalesce(sum(dd.lost), 0)::bigint as t_lost
    from public.dashboard_daily dd
    where dd.day >= week_start and dd.day < week_start + 7
  ),
  week_deals as (
    select d.stage, d.lost_reason_id, d.first_response_at, d.created_at
    from public.deals d
    where (d.created_at at time zone 'America/Santiago')::date >= week_start
      and (d.created_at at time zone 'America/Santiago')::date < week_start + 7
  )
  select t.t_entries, t.t_contacted, t.t_quoted, t.t_won, t.t_won_amount, t.t_lost,
         coalesce((
           select jsonb_agg(jsonb_build_object('reason', r.reason, 'count', r.n) order by r.n desc, r.reason)
           from (
             select lr.name as reason, count(*) as n
             from week_deals wd
                 left join public.lost_reasons lr on lr.id = wd.lost_reason_id
             where wd.stage = 'perdido'
             group by lr.name
           ) r
         ), '[]'::jsonb),
         (select count(*) from week_deals wd
           where wd.stage = 'nuevo' and wd.first_response_at is null
             and wd.created_at <= now() - interval '24 hours'),
         (select count(*) from public.followups f
           where f.status = 'vencido'
             and (f.scheduled_at at time zone 'America/Santiago')::date >= week_start
             and (f.scheduled_at at time zone 'America/Santiago')::date < week_start + 7)
  from totals t;
end;
$$;

-- Grants by hand (db diff does not emit them).
revoke execute on function public.weekly_report_data(date) from public, anon;
grant execute on function public.weekly_report_data(date) to authenticated, service_role;
