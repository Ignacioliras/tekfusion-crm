-- Fase 2: RLS de TekFusion (supabase/schemas/11_tekfusion_policies.sql) en
-- reemplazo de las policies "using (true)" de Atomic (05_policies.sql).
-- Revisada a mano: se quitaron los fantasmas de db diff (pgjwt y vistas sin cambios).
drop policy "Company Delete Policy" on "public"."companies";

drop policy "Enable insert for authenticated users only" on "public"."companies";

drop policy "Enable read access for authenticated users" on "public"."companies";

drop policy "Enable update for authenticated users only" on "public"."companies";

drop policy "Enable insert for admins" on "public"."configuration";

drop policy "Enable read for authenticated" on "public"."configuration";

drop policy "Enable update for admins" on "public"."configuration";

drop policy "Contact Notes Delete Policy" on "public"."contact_notes";

drop policy "Contact Notes Update policy" on "public"."contact_notes";

drop policy "Enable insert for authenticated users only" on "public"."contact_notes";

drop policy "Enable read access for authenticated users" on "public"."contact_notes";

drop policy "Contact Delete Policy" on "public"."contacts";

drop policy "Enable insert for authenticated users only" on "public"."contacts";

drop policy "Enable read access for authenticated users" on "public"."contacts";

drop policy "Enable update for authenticated users only" on "public"."contacts";

drop policy "Deal Notes Delete Policy" on "public"."deal_notes";

drop policy "Deal Notes Update Policy" on "public"."deal_notes";

drop policy "Enable insert for authenticated users only" on "public"."deal_notes";

drop policy "Enable read access for authenticated users" on "public"."deal_notes";

drop policy "Deals Delete Policy" on "public"."deals";

drop policy "Enable insert for authenticated users only" on "public"."deals";

drop policy "Enable read access for authenticated users" on "public"."deals";

drop policy "Enable update for authenticated users only" on "public"."deals";

drop policy "Enable access for authenticated users only" on "public"."favicons_excluded_domains";

drop policy "Enable read access for authenticated users" on "public"."sales";

drop policy "Enable delete for authenticated users only" on "public"."tags";

drop policy "Enable insert for authenticated users only" on "public"."tags";

drop policy "Enable read access for authenticated users" on "public"."tags";

drop policy "Enable update for authenticated users only" on "public"."tags";

drop policy "Enable insert for authenticated users only" on "public"."tasks";

drop policy "Enable read access for authenticated users" on "public"."tasks";

drop policy "Task Delete Policy" on "public"."tasks";

drop policy "Task Update Policy" on "public"."tasks";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_edit_contact(contact_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.can_edit_deal(deal_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select public.is_manager() or exists (
    select 1 from public.deals d
    where d.id = deal_id and d.sales_id = public.current_sales_id()
  )
$function$
;

CREATE OR REPLACE FUNCTION public.current_sales_id()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select id from public.sales where user_id = auth.uid() and not disabled
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS public.user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select role from public.sales where user_id = auth.uid() and not disabled
$function$
;

CREATE OR REPLACE FUNCTION public.is_internal_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select public.current_user_role() is not null
$function$
;

CREATE OR REPLACE FUNCTION public.is_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(public.current_user_role() = 'manager', false)
$function$
;

CREATE OR REPLACE FUNCTION public.protect_sales_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.take_deal(deal_id bigint)
 RETURNS public.deals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

  create policy "business_lines_select"
  on "public"."business_lines"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "business_lines_write"
  on "public"."business_lines"
  as permissive
  for all
  to authenticated
using (public.is_manager())
with check (public.is_manager());



  create policy "companies_delete"
  on "public"."companies"
  as permissive
  for delete
  to authenticated
using (public.is_manager());



  create policy "companies_insert"
  on "public"."companies"
  as permissive
  for insert
  to authenticated
with check ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "companies_select"
  on "public"."companies"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "companies_update"
  on "public"."companies"
  as permissive
  for update
  to authenticated
using ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])))
with check ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "configuration_insert"
  on "public"."configuration"
  as permissive
  for insert
  to authenticated
with check (public.is_manager());



  create policy "configuration_select"
  on "public"."configuration"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "configuration_update"
  on "public"."configuration"
  as permissive
  for update
  to authenticated
using (public.is_manager())
with check (public.is_manager());



  create policy "contact_notes_delete"
  on "public"."contact_notes"
  as permissive
  for delete
  to authenticated
using (public.can_edit_contact(contact_id));



  create policy "contact_notes_insert"
  on "public"."contact_notes"
  as permissive
  for insert
  to authenticated
with check (public.can_edit_contact(contact_id));



  create policy "contact_notes_select"
  on "public"."contact_notes"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.contacts c
  WHERE (c.id = contact_notes.contact_id))));



  create policy "contact_notes_update"
  on "public"."contact_notes"
  as permissive
  for update
  to authenticated
using (public.can_edit_contact(contact_id))
with check (public.can_edit_contact(contact_id));



  create policy "contacts_delete"
  on "public"."contacts"
  as permissive
  for delete
  to authenticated
using (public.is_manager());



  create policy "contacts_insert"
  on "public"."contacts"
  as permissive
  for insert
  to authenticated
with check ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "contacts_select"
  on "public"."contacts"
  as permissive
  for select
  to authenticated
using (((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'reader'::public.user_role])) OR (sales_id = public.current_sales_id()) OR (EXISTS ( SELECT 1
   FROM public.deals d
  WHERE (contacts.id = ANY (d.contact_ids))))));



  create policy "contacts_update"
  on "public"."contacts"
  as permissive
  for update
  to authenticated
using (public.can_edit_contact(id))
with check (public.can_edit_contact(id));



  create policy "deal_notes_delete"
  on "public"."deal_notes"
  as permissive
  for delete
  to authenticated
using (public.can_edit_deal(deal_id));



  create policy "deal_notes_insert"
  on "public"."deal_notes"
  as permissive
  for insert
  to authenticated
with check (public.can_edit_deal(deal_id));



  create policy "deal_notes_select"
  on "public"."deal_notes"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.deals d
  WHERE (d.id = deal_notes.deal_id))));



  create policy "deal_notes_update"
  on "public"."deal_notes"
  as permissive
  for update
  to authenticated
using (public.can_edit_deal(deal_id))
with check (public.can_edit_deal(deal_id));



  create policy "deals_insert"
  on "public"."deals"
  as permissive
  for insert
  to authenticated
with check ((public.is_manager() OR ((public.current_user_role() = 'executive'::public.user_role) AND (sales_id = public.current_sales_id()))));



  create policy "deals_select"
  on "public"."deals"
  as permissive
  for select
  to authenticated
using (((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'reader'::public.user_role])) OR (sales_id = public.current_sales_id()) OR ((sales_id IS NULL) AND (public.current_user_role() = 'executive'::public.user_role))));



  create policy "deals_update"
  on "public"."deals"
  as permissive
  for update
  to authenticated
using ((public.is_manager() OR (sales_id = public.current_sales_id())))
with check ((public.is_manager() OR (sales_id = public.current_sales_id())));



  create policy "favicons_excluded_domains_all"
  on "public"."favicons_excluded_domains"
  as permissive
  for all
  to authenticated
using (public.is_internal_user())
with check (public.is_internal_user());



  create policy "lost_reasons_select"
  on "public"."lost_reasons"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "lost_reasons_write"
  on "public"."lost_reasons"
  as permissive
  for all
  to authenticated
using (public.is_manager())
with check (public.is_manager());



  create policy "sales_select"
  on "public"."sales"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "sales_update"
  on "public"."sales"
  as permissive
  for update
  to authenticated
using ((public.is_manager() OR (id = public.current_sales_id())))
with check ((public.is_manager() OR (id = public.current_sales_id())));



  create policy "sales_absences_select"
  on "public"."sales_absences"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "sales_absences_write"
  on "public"."sales_absences"
  as permissive
  for all
  to authenticated
using (public.is_manager())
with check (public.is_manager());



  create policy "tags_delete"
  on "public"."tags"
  as permissive
  for delete
  to authenticated
using ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "tags_insert"
  on "public"."tags"
  as permissive
  for insert
  to authenticated
with check ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "tags_select"
  on "public"."tags"
  as permissive
  for select
  to authenticated
using (public.is_internal_user());



  create policy "tags_update"
  on "public"."tags"
  as permissive
  for update
  to authenticated
using ((public.current_user_role() = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "tasks_delete"
  on "public"."tasks"
  as permissive
  for delete
  to authenticated
using (public.can_edit_contact(contact_id));



  create policy "tasks_insert"
  on "public"."tasks"
  as permissive
  for insert
  to authenticated
with check (public.can_edit_contact(contact_id));



  create policy "tasks_select"
  on "public"."tasks"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.contacts c
  WHERE (c.id = tasks.contact_id))));



  create policy "tasks_update"
  on "public"."tasks"
  as permissive
  for update
  to authenticated
using (public.can_edit_contact(contact_id))
with check (public.can_edit_contact(contact_id));


CREATE TRIGGER protect_sales_columns_trigger BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.protect_sales_columns();


