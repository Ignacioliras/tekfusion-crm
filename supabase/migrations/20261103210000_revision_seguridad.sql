-- Fixes from the security review of fase-2/seguridad (docs/10, 2026-11-03):
-- TOTP enforced in the database (aal2), offboard_sale only through the Edge
-- Function with an explicit actor, advisory lock on the last-manager rule,
-- storage writes limited to editable leads/contacts, bigint guard in
-- can_read_attachment, audit_log kept when a lead goes, "disabled" written
-- only by the Edge Function. Written by hand (CLAUDE.md §4).

-- The sales row of the logged-in user, or null when disabled / not a user /
-- not verified by TOTP when it must be (docs/08: mandatory for managers, and
-- for anyone who enrolled a factor). The JWT carries the session's level
-- (aal); a manager without a factor sees nothing until enrolling, which only
-- talks to Auth. Only the own sales row stays readable (sales_select).
CREATE OR REPLACE FUNCTION "public"."current_sales_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select s.id from public.sales s
  where s.user_id = auth.uid() and not s.disabled
    and (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
         or (s.role <> 'manager' and not exists (
               select 1 from auth.mfa_factors f
               where f.user_id = s.user_id and f.status = 'verified')))
$$;

CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select s.role from public.sales s
  where s.user_id = auth.uid() and not s.disabled
    and (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
         or (s.role <> 'manager' and not exists (
               select 1 from auth.mfa_factors f
               where f.user_id = s.user_id and f.status = 'verified')))
$$;

drop policy if exists sales_select on public.sales;
-- Everyone internal reads the users; a session that still has to verify its
-- second factor reads only its own row (the app needs the role to send it to
-- the MFA pages).
create policy sales_select on public.sales for select to authenticated
    using ((select public.is_internal_user()) or (user_id = (select auth.uid()) and not disabled));

drop function if exists public.offboard_sale(bigint);
-- "Dar de baja" a user (docs/08 checklist, Fase 2). Only the users Edge
-- Function calls it (service role), after banning the user in Auth; it passes
-- the manager doing it as actor_id. Disables the user, hands their open leads
-- and their business lines to their substitute (or leaves them unassigned),
-- closes every session and writes the audit trail. Reactivation: Atomic's
-- "disabled" switch, also through the Edge Function.
-- Not here yet: SMTP/IMAP keys (Fase 5) and WhatsApp conversations (Fase 4).
CREATE OR REPLACE FUNCTION "public"."offboard_sale"("sale_id" bigint, "actor_id" bigint) RETURNS "public"."audit_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target public.sales;
  substitute bigint;
  reassigned bigint[];
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

  -- The substitute of the lines the user owns (one per user, Configuración →
  -- Usuarios); only an active executive or manager can receive leads.
  select l.substitute_sales_id into substitute
    from public.business_lines l
    join public.sales s on s.id = l.substitute_sales_id
   where l.owner_sales_id = target.id and not s.disabled and s.role <> 'reader'
   order by l.code limit 1;

  -- Open leads (ETAPAS_ABIERTAS of estados.ts); closed and archived ones keep their owner.
  with moved as (
    update public.deals
       set sales_id = substitute, updated_at = now(), last_activity_at = now()
     where sales_id = target.id and archived_at is null
       and stage in ('nuevo', 'contactado', 'cotizado')
    returning id
  )
  select coalesce(array_agg(id order by id), '{}') into reassigned from moved;

  update public.business_lines set owner_sales_id = substitute, substitute_sales_id = null
   where owner_sales_id = target.id;
  update public.business_lines set substitute_sales_id = null
   where substitute_sales_id = target.id;

  -- ensure_active_manager_trigger refuses to disable the last active manager.
  update public.sales set disabled = true where id = target.id;
  delete from auth.sessions where user_id = target.user_id;

  insert into public.audit_log (actor_sales_id, action, target_sales_id, deal_id, details)
  select actor_id, 'deal.reassigned', target.id, d,
         jsonb_build_object('from', target.id, 'to', substitute, 'reason', 'offboarding')
    from unnest(reassigned) as d;
  insert into public.audit_log (actor_sales_id, action, target_sales_id, details)
  values (actor_id, 'sale.offboarded', target.id,
          jsonb_build_object('substitute_sales_id', substitute, 'reassigned_deal_ids', to_jsonb(reassigned)))
  returning * into entry;
  return entry;
end;
$$;
revoke execute on function public.offboard_sale(bigint, bigint) from public, anon, authenticated;
grant execute on function public.offboard_sale(bigint, bigint) to service_role;

CREATE OR REPLACE FUNCTION "public"."ensure_active_manager"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- Two concurrent demotions would each still see the other manager active.
  perform pg_advisory_xact_lock(hashtext('active_manager'));
  if old.role = 'manager' and not old.disabled
     and (new.role <> 'manager' or new.disabled)
     and not exists (
       select 1 from public.sales where role = 'manager' and not disabled and id <> new.id
     ) then
    raise exception 'at least one active manager is required' using errcode = '23514';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."can_read_attachment"("object_name" text) RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  parts text[] := string_to_array(object_name, '/');
  owner_id bigint;
begin
  if not public.is_internal_user() then
    return false;
  end if;
  if coalesce(array_length(parts, 1), 0) < 2 then
    return public.is_manager();
  end if;
  if parts[1] in ('companies', 'sales', 'config') then
    return true;
  end if;
  -- length <= 15: a longer run of digits would overflow bigint and make every
  -- listing of the bucket fail for everyone.
  if parts[1] in ('deals', 'contacts') and array_length(parts, 1) >= 3
     and parts[2] ~ '^[0-9]+$' and length(parts[2]) <= 15 then
    owner_id := parts[2]::bigint;
    if parts[1] = 'deals' then
      return exists (select 1 from public.deals d where d.id = owner_id);
    end if;
    return exists (select 1 from public.contacts c where c.id = owner_id);
  end if;
  return public.is_manager();
end;
$$;

-- Upload and delete: the lead or contact must be editable by the caller
-- (can_edit_deal / can_edit_contact, under RLS); logos, avatars and the
-- configuration logos belong to managers and executives.
CREATE OR REPLACE FUNCTION "public"."can_write_attachment"("object_name" text) RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  parts text[] := string_to_array(object_name, '/');
begin
  if public.current_user_role() not in ('manager', 'executive') then
    return false;
  end if;
  if coalesce(array_length(parts, 1), 0) < 2 then
    return false;
  end if;
  if parts[1] in ('companies', 'sales', 'config') then
    return true;
  end if;
  if parts[1] in ('deals', 'contacts') and array_length(parts, 1) >= 3
     and parts[2] ~ '^[0-9]+$' and length(parts[2]) <= 15 then
    if parts[1] = 'deals' then
      return public.can_edit_deal(parts[2]::bigint);
    end if;
    return public.can_edit_contact(parts[2]::bigint);
  end if;
  return false;
end;
$$;
revoke execute on function public.can_write_attachment(text) from public, anon;
grant execute on function public.can_write_attachment(text) to authenticated, service_role;

drop policy if exists attachments_select on storage.objects;
drop policy if exists attachments_insert on storage.objects;
drop policy if exists attachments_delete on storage.objects;
create policy attachments_select on storage.objects for select to authenticated
    using (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_read_attachment(name));
create policy attachments_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_write_attachment(name));
create policy attachments_delete on storage.objects for delete to authenticated
    using (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_write_attachment(name));

alter table public.audit_log drop constraint audit_log_deal_id_fkey;
alter table public.audit_log add constraint audit_log_deal_id_fkey
    foreign key (deal_id) references public.deals (id) on delete set null;
revoke all on table public.audit_log from anon;

revoke update (disabled) on table public.sales from authenticated;

drop policy if exists configuration_select on public.configuration;
-- Branding and pipeline settings: also readable by a session that still has
-- to verify its second factor (the MFA pages render the logo and title).
create policy configuration_select on public.configuration for select to authenticated
    using ((select public.is_internal_user())
        or exists (select 1 from public.sales s where s.user_id = (select auth.uid()) and not s.disabled));
