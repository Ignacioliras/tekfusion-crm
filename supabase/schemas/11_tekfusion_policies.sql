--
-- TekFusion: RLS helpers and policies (Fase 2). Replaces Atomic's "using (true)"
-- policies. Rules: docs/08-seguridad-roles.md; decisions: docs/10-decisiones.md
-- (2026-11-03). Roles: manager (gerencia), executive (ejecutivo), reader (lector).
-- Every policy goes through current_user_role(), so a disabled user sees nothing.
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
  select coalesce(public.current_user_role() = 'manager', false)
$$;

-- Any active internal user (manager, executive or reader).
CREATE OR REPLACE FUNCTION "public"."is_internal_user"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select public.current_user_role() is not null
$$;

-- Security invoker on purpose: the subqueries must go through the RLS of
-- deals and contacts for the calling user.
CREATE OR REPLACE FUNCTION "public"."can_edit_deal"("deal_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select public.is_manager() or exists (
    select 1 from public.deals d
    where d.id = deal_id and d.sales_id = public.current_sales_id()
  )
$$;

CREATE OR REPLACE FUNCTION "public"."can_edit_contact"("contact_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select public.is_manager() or (
    public.current_user_role() = 'executive' and exists (
      select 1 from public.contacts c
      where c.id = contact_id and (
        c.sales_id = public.current_sales_id()
        or exists (
          select 1 from public.deals d
          where c.id = any (d.contact_ids) and d.sales_id = public.current_sales_id()
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
   where id = deal_id and sales_id is null and archived_at is null
   returning * into taken;
  if not found then
    raise exception 'lead % is not available' , deal_id using errcode = 'P0002';
  end if;
  -- Fase 3: insert a deal_events row and alert management.
  return taken;
end;
$$;

-- role, administrator and disabled are changed only by managers. Service role
-- (Edge Function "users", migrations, seed) has no auth.uid() and passes.
CREATE OR REPLACE FUNCTION "public"."protect_sales_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then
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

-- deals (leads) ------------------------------------------------------------
-- No delete policy on purpose: leads are never deleted (decision 3, RF-17).
create policy deals_select on public.deals for select to authenticated using (
    public.current_user_role() in ('manager', 'reader')
    or sales_id = public.current_sales_id()
    or (sales_id is null and public.current_user_role() = 'executive')
);
create policy deals_insert on public.deals for insert to authenticated with check (
    public.is_manager()
    or (public.current_user_role() = 'executive' and sales_id = public.current_sales_id())
);
-- with check keeps sales_id = me for executives: only managers reassign.
create policy deals_update on public.deals for update to authenticated
    using (public.is_manager() or sales_id = public.current_sales_id())
    with check (public.is_manager() or sales_id = public.current_sales_id());

-- contacts -----------------------------------------------------------------
-- Visible through a visible deal (the subquery runs under the deals RLS).
create policy contacts_select on public.contacts for select to authenticated using (
    public.current_user_role() in ('manager', 'reader')
    or sales_id = public.current_sales_id()
    or exists (select 1 from public.deals d where contacts.id = any (d.contact_ids))
);
create policy contacts_insert on public.contacts for insert to authenticated
    with check (public.current_user_role() in ('manager', 'executive'));
create policy contacts_update on public.contacts for update to authenticated
    using (public.can_edit_contact(id))
    with check (public.can_edit_contact(id));
create policy contacts_delete on public.contacts for delete to authenticated
    using (public.is_manager());

-- companies (decision 5) ---------------------------------------------------
create policy companies_select on public.companies for select to authenticated
    using (public.is_internal_user());
create policy companies_insert on public.companies for insert to authenticated
    with check (public.current_user_role() in ('manager', 'executive'));
create policy companies_update on public.companies for update to authenticated
    using (public.current_user_role() in ('manager', 'executive'))
    with check (public.current_user_role() in ('manager', 'executive'));
create policy companies_delete on public.companies for delete to authenticated
    using (public.is_manager());

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
-- Everyone sees names and roles; a user edits their own row (protected columns
-- are guarded by the trigger above); managers edit anyone. No insert/delete:
-- users are created and disabled through the "users" Edge Function.
create policy sales_select on public.sales for select to authenticated
    using (public.is_internal_user());
create policy sales_update on public.sales for update to authenticated
    using (public.is_manager() or id = public.current_sales_id())
    with check (public.is_manager() or id = public.current_sales_id());

-- tags ---------------------------------------------------------------------
create policy tags_select on public.tags for select to authenticated
    using (public.is_internal_user());
create policy tags_insert on public.tags for insert to authenticated
    with check (public.current_user_role() in ('manager', 'executive'));
create policy tags_update on public.tags for update to authenticated
    using (public.current_user_role() in ('manager', 'executive'));
create policy tags_delete on public.tags for delete to authenticated
    using (public.current_user_role() in ('manager', 'executive'));

-- configuration tables: everyone reads, managers write -------------------
create policy configuration_select on public.configuration for select to authenticated
    using (public.is_internal_user());
create policy configuration_insert on public.configuration for insert to authenticated
    with check (public.is_manager());
create policy configuration_update on public.configuration for update to authenticated
    using (public.is_manager()) with check (public.is_manager());

create policy business_lines_select on public.business_lines for select to authenticated
    using (public.is_internal_user());
create policy business_lines_write on public.business_lines for all to authenticated
    using (public.is_manager()) with check (public.is_manager());

create policy lost_reasons_select on public.lost_reasons for select to authenticated
    using (public.is_internal_user());
create policy lost_reasons_write on public.lost_reasons for all to authenticated
    using (public.is_manager()) with check (public.is_manager());

create policy sales_absences_select on public.sales_absences for select to authenticated
    using (public.is_internal_user());
create policy sales_absences_write on public.sales_absences for all to authenticated
    using (public.is_manager()) with check (public.is_manager());

-- Lookup table used by the favicon trigger; harmless, but never for outsiders.
create policy favicons_excluded_domains_all on public.favicons_excluded_domains for all to authenticated
    using (public.is_internal_user()) with check (public.is_internal_user());
