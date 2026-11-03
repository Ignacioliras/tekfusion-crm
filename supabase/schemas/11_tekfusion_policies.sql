--
-- TekFusion: RLS helpers, guard triggers and policies (Fase 2). Replaces
-- Atomic's "using (true)" policies. Rules: docs/08-seguridad-roles.md;
-- decisions: docs/10-decisiones.md (2026-11-03). Roles: manager (gerencia),
-- executive (ejecutivo), reader (lector). Every policy goes through
-- current_user_role(), so a disabled user sees nothing.
-- Helpers are called as `(select public.fn())` inside policies on purpose: the
-- security definer ones cannot be inlined, and the subselect makes Postgres
-- evaluate them once per query (InitPlan) instead of once per row.
-- Tests: supabase/tests/10_rls_*.test.sql.
--

-- Helpers ------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION "public"."is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce((select public.current_user_role()) = 'manager', false)
$$;

-- Any active internal user (manager, executive or reader).
CREATE OR REPLACE FUNCTION "public"."is_internal_user"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select (select public.current_user_role()) is not null
$$;

-- Security invoker on purpose: the subqueries must go through the RLS of
-- deals and contacts for the calling user.
CREATE OR REPLACE FUNCTION "public"."can_edit_deal"("deal_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select (select public.is_manager()) or (
    (select public.current_user_role()) = 'executive' and exists (
      select 1 from public.deals d
      where d.id = deal_id and d.sales_id = (select public.current_sales_id())
    )
  )
$$;

-- `contact_ids @> array[id]` (not `id = any(contact_ids)`) so the GIN index
-- deals_contact_ids_idx is used.
CREATE OR REPLACE FUNCTION "public"."can_edit_contact"("contact_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select (select public.is_manager()) or (
    (select public.current_user_role()) = 'executive' and exists (
      select 1 from public.contacts c
      where c.id = contact_id and (
        c.sales_id = (select public.current_sales_id())
        or exists (
          select 1 from public.deals d
          where d.contact_ids @> array[c.id]
            and d.sales_id = (select public.current_sales_id())
        )
      )
    )
  )
$$;

-- An executive takes an unassigned lead (decision 4). Managers can use it too.
CREATE OR REPLACE FUNCTION "public"."take_deal"("deal_id" bigint) RETURNS "public"."deals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  me bigint := public.current_sales_id();
  taken public.deals;
begin
  if me is null or public.current_user_role() not in ('manager', 'executive') then
    raise exception 'only executives and managers can take a lead' using errcode = '42501';
  end if;
  update public.deals
     set sales_id = me, updated_at = now(), last_activity_at = now()
   where id = deal_id and sales_id is null and archived_at is null and stage <> 'archivado'
   returning * into taken;
  if not found then
    raise exception 'lead % is not available' , deal_id using errcode = 'P0002';
  end if;
  -- Fase 3: insert a deal_events row and alert management.
  return taken;
end;
$$;

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

-- Guard triggers -----------------------------------------------------------
-- They run for API sessions only: service role (Edge Functions), postgres
-- (migrations, seed) and other backend roles pass. The gate is the connection
-- role, not auth.uid(), so an API session without a `sub` claim is not exempt.

-- A lead inserted without owner goes to the caller (Atomic's default), except
-- when the caller is a manager: managers may leave it unassigned, as the CSV
-- importer does for a row with no executive and no line owner (docs/10,
-- 2026-11-03). Executives still get it (their insert policy requires it); the
-- service role (n8n, Edge Functions) has no caller and leaves it null.
create or replace trigger set_deal_sales_id_trigger
    before insert on public.deals
    for each row
    when (not public.is_manager())
    execute function public.set_sales_id_default();

-- role, administrator and disabled are changed only by managers.
CREATE OR REPLACE FUNCTION "public"."protect_sales_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if (new.role, new.administrator, new.disabled)
     is distinct from (old.role, old.administrator, old.disabled)
     and not public.is_manager() then
    raise exception 'only managers can change role, administrator or disabled'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Runs before sync_sales_role_trigger (alphabetical order) with the submitted values.
create or replace trigger protect_sales_columns_trigger
    before update on public.sales
    for each row execute function public.protect_sales_columns();

-- The system always keeps at least one active manager: the last one cannot be
-- demoted or disabled (not even by itself, nor through the Edge Function).
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

create or replace trigger ensure_active_manager_trigger
    after update of role, administrator, disabled on public.sales
    for each row execute function public.ensure_active_manager();

-- An executive cannot hand a contact to someone else, nor create one for
-- someone else; its owner only changes through managers.
CREATE OR REPLACE FUNCTION "public"."protect_contact_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_manager() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- Runs before set_sales_id_default_trigger (alphabetical), which fills a
    -- null sales_id with the caller: null or the caller's own id are the only
    -- accepted values for an executive.
    if new.sales_id is not null and new.sales_id <> public.current_sales_id() then
      raise exception 'a contact can only be created for yourself' using errcode = '42501';
    end if;
  elsif new.sales_id is distinct from old.sales_id then
    raise exception 'only managers can reassign a contact' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace trigger protect_contact_owner_trigger
    before insert or update of sales_id on public.contacts
    for each row execute function public.protect_contact_owner();

-- Contacts become visible through deals.contact_ids, so an executive may only
-- link contacts it can already reach: its own, or ones without an owner.
CREATE OR REPLACE FUNCTION "public"."guard_deal_contact_ids"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_manager() then
    return new;
  end if;
  if exists (
    select 1 from unnest(coalesce(new.contact_ids, '{}')) as cid
    where (tg_op = 'INSERT' or cid <> all (coalesce(old.contact_ids, '{}')))
      and not exists (
        select 1 from public.contacts c
        where c.id = cid
          and (c.sales_id = public.current_sales_id() or c.sales_id is null)
      )
  ) then
    raise exception 'a lead can only link contacts you manage' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace trigger guard_deal_contact_ids_trigger
    before insert or update of contact_ids on public.deals
    for each row execute function public.guard_deal_contact_ids();

-- deals (leads) ------------------------------------------------------------
-- No delete policy on purpose: leads are never deleted (decision 3, RF-17).
create policy deals_select on public.deals for select to authenticated using (
    (select public.current_user_role()) in ('manager', 'reader')
    or sales_id = (select public.current_sales_id())
    or (sales_id is null and (select public.current_user_role()) = 'executive')
);
create policy deals_insert on public.deals for insert to authenticated with check (
    (select public.is_manager())
    or ((select public.current_user_role()) = 'executive' and sales_id = (select public.current_sales_id()))
);
-- with check keeps sales_id = me for executives: only managers reassign.
create policy deals_update on public.deals for update to authenticated
    using ((select public.is_manager()) or sales_id = (select public.current_sales_id()))
    with check ((select public.is_manager()) or sales_id = (select public.current_sales_id()));

-- contacts -----------------------------------------------------------------
-- Visible through a visible deal (the subquery runs under the deals RLS).
create policy contacts_select on public.contacts for select to authenticated using (
    (select public.current_user_role()) in ('manager', 'reader')
    or sales_id = (select public.current_sales_id())
    or exists (select 1 from public.deals d where d.contact_ids @> array[contacts.id])
);
create policy contacts_insert on public.contacts for insert to authenticated
    with check ((select public.current_user_role()) in ('manager', 'executive'));
create policy contacts_update on public.contacts for update to authenticated
    using (public.can_edit_contact(id))
    with check (public.can_edit_contact(id));
create policy contacts_delete on public.contacts for delete to authenticated
    using ((select public.is_manager()));

-- companies (decision 5) ---------------------------------------------------
create policy companies_select on public.companies for select to authenticated
    using ((select public.is_internal_user()));
create policy companies_insert on public.companies for insert to authenticated
    with check ((select public.current_user_role()) in ('manager', 'executive'));
create policy companies_update on public.companies for update to authenticated
    using ((select public.current_user_role()) in ('manager', 'executive'))
    with check ((select public.current_user_role()) in ('manager', 'executive'));
create policy companies_delete on public.companies for delete to authenticated
    using ((select public.is_manager()));

-- notes and tasks inherit the visibility of their parent ------------------
create policy deal_notes_select on public.deal_notes for select to authenticated
    using (exists (select 1 from public.deals d where d.id = deal_id));
create policy deal_notes_insert on public.deal_notes for insert to authenticated
    with check (public.can_edit_deal(deal_id));
create policy deal_notes_update on public.deal_notes for update to authenticated
    using (public.can_edit_deal(deal_id)) with check (public.can_edit_deal(deal_id));
create policy deal_notes_delete on public.deal_notes for delete to authenticated
    using (public.can_edit_deal(deal_id));

create policy contact_notes_select on public.contact_notes for select to authenticated
    using (exists (select 1 from public.contacts c where c.id = contact_id));
create policy contact_notes_insert on public.contact_notes for insert to authenticated
    with check (public.can_edit_contact(contact_id));
create policy contact_notes_update on public.contact_notes for update to authenticated
    using (public.can_edit_contact(contact_id)) with check (public.can_edit_contact(contact_id));
create policy contact_notes_delete on public.contact_notes for delete to authenticated
    using (public.can_edit_contact(contact_id));

create policy tasks_select on public.tasks for select to authenticated
    using (exists (select 1 from public.contacts c where c.id = contact_id));
create policy tasks_insert on public.tasks for insert to authenticated
    with check (public.can_edit_contact(contact_id));
create policy tasks_update on public.tasks for update to authenticated
    using (public.can_edit_contact(contact_id)) with check (public.can_edit_contact(contact_id));
create policy tasks_delete on public.tasks for delete to authenticated
    using (public.can_edit_contact(contact_id));

-- sales (users) ------------------------------------------------------------
-- Everyone sees names and roles; a user edits their own row (the trigger
-- guards role/administrator/disabled and 06_grants.sql limits the columns
-- PostgREST can write); managers edit anyone. No insert/delete: users are
-- created and disabled through the "users" Edge Function.
-- Everyone internal reads the users; a session that still has to verify its
-- second factor reads only its own row (the app needs the role to send it to
-- the MFA pages).
create policy sales_select on public.sales for select to authenticated
    using ((select public.is_internal_user()) or (user_id = (select auth.uid()) and not disabled));
create policy sales_update on public.sales for update to authenticated
    using ((select public.is_manager()) or id = (select public.current_sales_id()))
    with check ((select public.is_manager()) or id = (select public.current_sales_id()));

-- tags ---------------------------------------------------------------------
create policy tags_select on public.tags for select to authenticated
    using ((select public.is_internal_user()));
create policy tags_insert on public.tags for insert to authenticated
    with check ((select public.current_user_role()) in ('manager', 'executive'));
create policy tags_update on public.tags for update to authenticated
    using ((select public.current_user_role()) in ('manager', 'executive'))
    with check ((select public.current_user_role()) in ('manager', 'executive'));
create policy tags_delete on public.tags for delete to authenticated
    using ((select public.current_user_role()) in ('manager', 'executive'));

-- configuration tables: everyone reads, managers write -------------------
-- Branding and pipeline settings: also readable by a session that still has
-- to verify its second factor (the MFA pages render the logo and title).
create policy configuration_select on public.configuration for select to authenticated
    using ((select public.is_internal_user())
        or exists (select 1 from public.sales s where s.user_id = (select auth.uid()) and not s.disabled));
create policy configuration_insert on public.configuration for insert to authenticated
    with check ((select public.is_manager()));
create policy configuration_update on public.configuration for update to authenticated
    using ((select public.is_manager())) with check ((select public.is_manager()));

create policy business_lines_select on public.business_lines for select to authenticated
    using ((select public.is_internal_user()));
create policy business_lines_write on public.business_lines for all to authenticated
    using ((select public.is_manager())) with check ((select public.is_manager()));

create policy lost_reasons_select on public.lost_reasons for select to authenticated
    using ((select public.is_internal_user()));
create policy lost_reasons_write on public.lost_reasons for all to authenticated
    using ((select public.is_manager())) with check ((select public.is_manager()));

create policy sales_absences_select on public.sales_absences for select to authenticated
    using ((select public.is_internal_user()));
create policy sales_absences_write on public.sales_absences for all to authenticated
    using ((select public.is_manager())) with check ((select public.is_manager()));

-- audit_log: managers read it; only the system writes (offboard_sale, service role).
create policy audit_log_select on public.audit_log for select to authenticated
    using ((select public.is_manager()));

-- Lookup table used by the favicon trigger; harmless, but never for outsiders.
create policy favicons_excluded_domains_all on public.favicons_excluded_domains for all to authenticated
    using ((select public.is_internal_user())) with check ((select public.is_internal_user()));

-- storage: the attachments bucket is private; a user signs (reads) only the
-- files of the leads and contacts it can see. Files are stored under the folder
-- of their owner (uploadToBucket in the supabase dataProvider):
--   deals/<deal_id>/…        the lead must be visible (deals RLS)
--   contacts/<contact_id>/…  the contact must be visible (contacts RLS)
--   companies/…, sales/…, config/…  any internal user (logos, avatars)
--   anything else (files Atomic left at the root)  managers only
-- Security invoker on purpose: the subselects run under the caller's RLS.
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

create policy attachments_select on storage.objects for select to authenticated
    using (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_read_attachment(name));
create policy attachments_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_write_attachment(name));
create policy attachments_delete on storage.objects for delete to authenticated
    using (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_write_attachment(name));

-- Fase 3 -------------------------------------------------------------------
-- quotes and followups follow their lead (docs/08): visible with the lead
-- (deals RLS), written by managers and the lead's owner, never deleted.

-- The author of a quote is the caller (Atomic's default, as in deal_notes).
create or replace trigger set_quote_sales_id_trigger
    before insert on public.quotes
    for each row execute function public.set_sales_id_default();

-- An executive edits its quotes and follow-ups but cannot move them to another
-- lead, nor change a quote's author or version (ra-core sends whole records,
-- so unchanged values pass). Managers and the system are not limited.
CREATE OR REPLACE FUNCTION "public"."guard_deal_child"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_manager() then
    return new;
  end if;
  if new.deal_id is distinct from old.deal_id then
    raise exception 'only managers can move a % to another lead', tg_table_name using errcode = '42501';
  end if;
  -- Nested: plpgsql does not short-circuit, and followups has no sales_id.
  if tg_table_name = 'quotes' then
    if (new.sales_id, new.version) is distinct from (old.sales_id, old.version) then
      raise exception 'only managers can change the author or version of a quote' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger guard_quote_update_trigger
    before update on public.quotes
    for each row execute function public.guard_deal_child();
create or replace trigger guard_followup_update_trigger
    before update on public.followups
    for each row execute function public.guard_deal_child();

create policy quotes_select on public.quotes for select to authenticated
    using (exists (select 1 from public.deals d where d.id = deal_id));
-- An executive signs its own quotes; managers may record one for anybody.
create policy quotes_insert on public.quotes for insert to authenticated
    with check (public.can_edit_deal(deal_id)
        and ((select public.is_manager()) or sales_id = (select public.current_sales_id())));
create policy quotes_update on public.quotes for update to authenticated
    using (public.can_edit_deal(deal_id)) with check (public.can_edit_deal(deal_id));

create policy followups_select on public.followups for select to authenticated
    using (exists (select 1 from public.deals d where d.id = deal_id));
create policy followups_insert on public.followups for insert to authenticated
    with check (public.can_edit_deal(deal_id));
create policy followups_update on public.followups for update to authenticated
    using (public.can_edit_deal(deal_id)) with check (public.can_edit_deal(deal_id));

-- alerts: the recipient and managers read them; only the recipient marks them
-- read (12_ grants update on read_at alone); the system inserts them.
create policy alerts_select on public.alerts for select to authenticated
    using (recipient_sales_id = (select public.current_sales_id()) or (select public.is_manager()));
-- with check read_at not null: an alert is never reopened (it would clash
-- with a newer open one in alerts_open_key).
create policy alerts_update on public.alerts for update to authenticated
    using (recipient_sales_id = (select public.current_sales_id()))
    with check (recipient_sales_id = (select public.current_sales_id()) and read_at is not null);

-- templates and quick replies: configuration, everyone reads, managers write.
create policy templates_select on public.templates for select to authenticated
    using ((select public.is_internal_user()));
create policy templates_write on public.templates for all to authenticated
    using ((select public.is_manager())) with check ((select public.is_manager()));

create policy quick_replies_select on public.quick_replies for select to authenticated
    using ((select public.is_internal_user()));
create policy quick_replies_write on public.quick_replies for all to authenticated
    using ((select public.is_manager())) with check ((select public.is_manager()));

-- storage: quote PDFs follow their lead like the deals/ attachments. Uploads
-- must use a regenerated name (uuid.pdf); no delete policy (quotes stay).
create policy quotes_files_select on storage.objects for select to authenticated
    using (bucket_id = 'quotes' and (select public.is_internal_user())
        and (storage.foldername(name))[1] = 'deals' and public.can_read_attachment(name));
create policy quotes_files_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'quotes' and (select public.is_internal_user())
        and name ~ '^deals/[1-9][0-9]{0,14}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' and public.can_write_attachment(name));
