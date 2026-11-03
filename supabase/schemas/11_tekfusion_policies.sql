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

-- The sales row of the logged-in user, or null when disabled / not a user.
CREATE OR REPLACE FUNCTION "public"."current_sales_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select id from public.sales where user_id = auth.uid() and not disabled
$$;

CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select role from public.sales where user_id = auth.uid() and not disabled
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
  select (select public.is_manager()) or exists (
    select 1 from public.deals d
    where d.id = deal_id and d.sales_id = (select public.current_sales_id())
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
create policy sales_select on public.sales for select to authenticated
    using ((select public.is_internal_user()));
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
create policy configuration_select on public.configuration for select to authenticated
    using ((select public.is_internal_user()));
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

-- Lookup table used by the favicon trigger; harmless, but never for outsiders.
create policy favicons_excluded_domains_all on public.favicons_excluded_domains for all to authenticated
    using ((select public.is_internal_user())) with check ((select public.is_internal_user()));

-- storage: attachments only for internal users; managers and executives
-- upload and delete (docs/08). The bucket is still public (Atomic builds
-- public URLs): signed URLs come in Fase 3.
create policy attachments_select on storage.objects for select to authenticated
    using (bucket_id = 'attachments' and (select public.is_internal_user()));
create policy attachments_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'attachments' and (select public.current_user_role()) in ('manager', 'executive'));
create policy attachments_delete on storage.objects for delete to authenticated
    using (bucket_id = 'attachments' and (select public.current_user_role()) in ('manager', 'executive'));
