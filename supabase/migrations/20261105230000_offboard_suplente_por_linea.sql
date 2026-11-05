-- fase-3/ajustes (T2 de la cola nocturna 2026-11-04): offboard_sale con
-- suplente por línea, contactos y tareas pendientes (reglas de Ignacio,
-- docs/10 2026-11-03). Written by hand: same body as 11_tekfusion_policies.sql.
CREATE OR REPLACE FUNCTION "public"."offboard_sale"("sale_id" bigint, "actor_id" bigint) RETURNS "public"."audit_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target public.sales;
  default_substitute bigint;
  moved_deals jsonb;
  moved_contacts bigint[];
  moved_tasks bigint[];
  entry public.audit_log;
begin
  -- auth.role(), not current_user: inside a security definer function
  -- current_user is the owner. Allowed list: the service role (Edge Function)
  -- and backend roles (no JWT); never an API session.
  if auth.role() is not null and auth.role() <> 'service_role' then
    raise exception 'offboard_sale is called through the users Edge Function' using errcode = '42501';
  end if;
  if not exists (select 1 from public.sales a where a.id = actor_id and a.role = 'manager' and not a.disabled) then
    raise exception 'actor % is not an active manager', actor_id using errcode = '42501';
  end if;
  -- Serializes with ensure_active_manager: two managers offboarding each other
  -- at once must not leave the system without one.
  perform pg_advisory_xact_lock(hashtext('active_manager'));

  select * into target from public.sales where id = sale_id for update;
  if not found then
    raise exception 'user % does not exist', sale_id using errcode = 'P0002';
  end if;
  if target.id = actor_id then
    raise exception 'a user cannot offboard itself' using errcode = '42501';
  end if;
  if target.disabled then
    raise exception 'user % is already disabled', sale_id using errcode = 'P0001';
  end if;

  -- Default substitute: the one of the user's first line (by code) that can
  -- receive leads (active, not a reader, not the user). Used for a lead whose
  -- own line has none, an 'indeterminada' lead, and contacts without leads.
  select l.substitute_sales_id into default_substitute
    from public.business_lines l
    join public.sales s on s.id = l.substitute_sales_id
   where l.owner_sales_id = target.id and not s.disabled and s.role <> 'reader'
     and s.id <> target.id
   order by l.code limit 1;

  -- (a) Open leads (ETAPAS_ABIERTAS of estados.ts) go to the substitute of
  -- their own line; closed and archived ones keep their owner (metrics).
  with targets as (
    select d.id,
           coalesce((select l.substitute_sales_id
                       from public.business_lines l
                       join public.sales s on s.id = l.substitute_sales_id
                      where l.code = d.business_line and not s.disabled
                        and s.role <> 'reader' and s.id <> target.id),
                    default_substitute) as new_owner
      from public.deals d
     where d.sales_id = target.id and d.archived_at is null
       and d.stage in ('nuevo', 'contactado', 'cotizado')
  ), moved as (
    update public.deals d
       set sales_id = t.new_owner, updated_at = now(), last_activity_at = now()
      from targets t
     where d.id = t.id
    returning d.id, d.sales_id, d.contact_ids
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'new_owner', sales_id, 'contacts', coalesce(contact_ids, '{}')) order by id), '[]')
    into moved_deals from moved;

  -- (b) Each contact goes to whoever received most of its reassigned leads
  -- (tie: lowest id); without any, to the default substitute (or no owner).
  with targets as (
    select co.id,
           coalesce((select m.new_owner
                       from jsonb_to_recordset(moved_deals) as m(id bigint, new_owner bigint, contacts bigint[])
                      where co.id = any(m.contacts) and m.new_owner is not null
                      group by m.new_owner
                      order by count(*) desc, m.new_owner
                      limit 1),
                    default_substitute) as new_owner
      from public.contacts co
     where co.sales_id = target.id
  ), moved as (
    update public.contacts co set sales_id = t.new_owner
      from targets t
     where co.id = t.id
    returning co.id
  )
  select coalesce(array_agg(id order by id), '{}') into moved_contacts from moved;

  -- (c) Pending tasks follow the new owner of their contact; done ones stay.
  with moved as (
    update public.tasks t set sales_id = co.sales_id
      from public.contacts co
     where co.id = t.contact_id and t.sales_id = target.id and t.done_date is null
    returning t.id
  )
  select coalesce(array_agg(id order by id), '{}') into moved_tasks from moved;

  -- Each line the user owned goes to its own substitute, or the default one.
  update public.business_lines l
     set owner_sales_id = coalesce(
           (select s.id from public.sales s
             where s.id = l.substitute_sales_id and not s.disabled
               and s.role <> 'reader' and s.id <> target.id),
           default_substitute),
         substitute_sales_id = null
   where l.owner_sales_id = target.id;
  update public.business_lines set substitute_sales_id = null
   where substitute_sales_id = target.id;

  -- ensure_active_manager_trigger refuses to disable the last active manager.
  update public.sales set disabled = true where id = target.id;
  delete from auth.sessions where user_id = target.user_id;

  insert into public.audit_log (actor_sales_id, action, target_sales_id, deal_id, details)
  select actor_id, 'deal.reassigned', target.id, m.id,
         jsonb_build_object('from', target.id, 'to', m.new_owner, 'reason', 'offboarding')
    from jsonb_to_recordset(moved_deals) as m(id bigint, new_owner bigint);
  insert into public.audit_log (actor_sales_id, action, target_sales_id, details)
  values (actor_id, 'sale.offboarded', target.id,
          jsonb_build_object(
            'substitute_sales_id', default_substitute,
            'reassigned_deal_ids', (select coalesce(jsonb_agg(m.id order by m.id), '[]')
                                      from jsonb_to_recordset(moved_deals) as m(id bigint)),
            'reassigned_contact_ids', to_jsonb(moved_contacts),
            'reassigned_task_ids', to_jsonb(moved_tasks)))
  returning * into entry;
  return entry;
end;
$$;

revoke execute on function public.offboard_sale(bigint, bigint) from public, anon, authenticated;
grant execute on function public.offboard_sale(bigint, bigint) to service_role;
