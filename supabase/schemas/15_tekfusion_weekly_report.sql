--
-- Closing date of a lead: when it reached ganado, perdido or archivado (Ignacio,
-- 2026-11-06). The weekly report counts won and lost leads by it (it filters
-- ganado / perdido itself); the kanban hides leads closed more than 30 days
-- ago. Null while the lead is open, and for leads inserted already closed
-- without one (RF-15 imports: the real date is unknown, so they belong to no
-- week).
--
alter table public.deals add column closed_at timestamp with time zone;

CREATE OR REPLACE FUNCTION "public"."set_deal_closed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.stage not in ('ganado', 'perdido', 'archivado') then
    new.closed_at := null;
  elsif tg_op = 'UPDATE' then
    if new.stage is distinct from old.stage then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger set_deal_closed_at_trigger
    before insert or update of stage on public.deals
    for each row execute function public.set_deal_closed_at();

--
-- Weekly report data (RF-12). n8n flow 09 (docs/06) reads it with the service
-- role to build the e-mail for management; managers may read it too (aal2
-- included via is_manager()). 42501 for anyone else, a session without JWT
-- included. Security invoker: a manager goes through RLS (and sees every
-- lead), the service role bypasses it.
--
-- The week is [week_start, week_start + 7) in America/Santiago, like
-- dashboard_daily.day. Three kinds of numbers (Ignacio, 2026-11-06):
--   entered that week   entries / contacted / quoted, summed from
--                       dashboard_daily (same definitions as 13_)
--   closed that week    won / won_amount / lost: leads in ganado / perdido
--                       whose closed_at falls in the week, whenever they
--                       entered. lost_by_reason: those lost leads per
--                       lost_reasons.name, as [{"reason", "count"}] ordered by
--                       count desc, then name
--   as of now           unattended: every lead still without contact once 24 h
--                       have gone by (docs/03 "Primer contacto"): stage
--                       'nuevo', no first_response_at, created_at <= now() -
--                       24 h. overdue_followups: every followup in status
--                       'vencido' (docs/03). Both of any week: week_start does
--                       not filter them.
--
CREATE OR REPLACE FUNCTION "public"."weekly_report_data"("week_start" "date") RETURNS TABLE("entries" bigint, "contacted" bigint, "quoted" bigint, "won" bigint, "won_amount" bigint, "lost" bigint, "lost_by_reason" "jsonb", "unattended" bigint, "overdue_followups" bigint)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_manager() and auth.role() is distinct from 'service_role' then
    raise exception 'only managers and the service role read the weekly report' using errcode = '42501';
  end if;
  if week_start is null then
    raise exception 'week_start is required' using errcode = '22023';
  end if;
  return query
  with totals as (
    select coalesce(sum(dd.leads), 0)::bigint as t_entries,
           coalesce(sum(dd.contacted), 0)::bigint as t_contacted,
           coalesce(sum(dd.quoted), 0)::bigint as t_quoted
    from public.dashboard_daily dd
    where dd.day >= week_start and dd.day < week_start + 7
  ),
  closed as (
    select d.stage, d.won_amount, d.lost_reason_id
    from public.deals d
    where d.stage in ('ganado', 'perdido')
      and (d.closed_at at time zone 'America/Santiago')::date >= week_start
      and (d.closed_at at time zone 'America/Santiago')::date < week_start + 7
  )
  select t.t_entries, t.t_contacted, t.t_quoted,
         (select count(*) from closed c where c.stage = 'ganado'),
         (select coalesce(sum(c.won_amount), 0)::bigint from closed c where c.stage = 'ganado'),
         (select count(*) from closed c where c.stage = 'perdido'),
         coalesce((
           select jsonb_agg(jsonb_build_object('reason', r.reason, 'count', r.n) order by r.n desc, r.reason)
           from (
             select lr.name as reason, count(*) as n
             from closed c
                 left join public.lost_reasons lr on lr.id = c.lost_reason_id
             where c.stage = 'perdido'
             group by lr.name
           ) r
         ), '[]'::jsonb),
         (select count(*) from public.deals d
           where d.stage = 'nuevo' and d.first_response_at is null
             and d.created_at <= now() - interval '24 hours'),
         (select count(*) from public.followups f where f.status = 'vencido')
  from totals t;
end;
$$;

-- Grants by hand (db diff does not emit them).
revoke execute on function public.weekly_report_data(date) from public, anon;
grant execute on function public.weekly_report_data(date) to authenticated, service_role;
