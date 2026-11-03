-- Fase 2: endurecimiento tras la revisión de seguridad y de base de datos
-- (docs/10-decisiones.md 2026-11-03): triggers de guarda, grants, índices,
-- activity_log sin raw_source, policies de Storage.
-- Revisada a mano: se quitaron los fantasmas de db diff (pgjwt y vistas sin
-- cambios) y se devolvió security_invoker a activity_log.
drop policy "business_lines_select" on "public"."business_lines";

drop policy "business_lines_write" on "public"."business_lines";

drop policy "companies_delete" on "public"."companies";

drop policy "companies_insert" on "public"."companies";

drop policy "companies_select" on "public"."companies";

drop policy "companies_update" on "public"."companies";

drop policy "configuration_insert" on "public"."configuration";

drop policy "configuration_select" on "public"."configuration";

drop policy "configuration_update" on "public"."configuration";

drop policy "contacts_delete" on "public"."contacts";

drop policy "contacts_insert" on "public"."contacts";

drop policy "contacts_select" on "public"."contacts";

drop policy "deals_insert" on "public"."deals";

drop policy "deals_select" on "public"."deals";

drop policy "deals_update" on "public"."deals";

drop policy "favicons_excluded_domains_all" on "public"."favicons_excluded_domains";

drop policy "lost_reasons_select" on "public"."lost_reasons";

drop policy "lost_reasons_write" on "public"."lost_reasons";

drop policy "sales_select" on "public"."sales";

drop policy "sales_update" on "public"."sales";

drop policy "sales_absences_select" on "public"."sales_absences";

drop policy "sales_absences_write" on "public"."sales_absences";

drop policy "tags_delete" on "public"."tags";

drop policy "tags_insert" on "public"."tags";

drop policy "tags_select" on "public"."tags";

drop policy "tags_update" on "public"."tags";

revoke delete on table "public"."business_lines" from "anon";

revoke insert on table "public"."business_lines" from "anon";

revoke references on table "public"."business_lines" from "anon";

revoke select on table "public"."business_lines" from "anon";

revoke trigger on table "public"."business_lines" from "anon";

revoke truncate on table "public"."business_lines" from "anon";

revoke update on table "public"."business_lines" from "anon";

revoke references on table "public"."business_lines" from "authenticated";

revoke trigger on table "public"."business_lines" from "authenticated";

revoke truncate on table "public"."business_lines" from "authenticated";

revoke delete on table "public"."companies" from "anon";

revoke insert on table "public"."companies" from "anon";

revoke references on table "public"."companies" from "anon";

revoke select on table "public"."companies" from "anon";

revoke trigger on table "public"."companies" from "anon";

revoke truncate on table "public"."companies" from "anon";

revoke update on table "public"."companies" from "anon";

revoke references on table "public"."companies" from "authenticated";

revoke trigger on table "public"."companies" from "authenticated";

revoke truncate on table "public"."companies" from "authenticated";

revoke delete on table "public"."configuration" from "anon";

revoke insert on table "public"."configuration" from "anon";

revoke references on table "public"."configuration" from "anon";

revoke select on table "public"."configuration" from "anon";

revoke trigger on table "public"."configuration" from "anon";

revoke truncate on table "public"."configuration" from "anon";

revoke update on table "public"."configuration" from "anon";

revoke references on table "public"."configuration" from "authenticated";

revoke trigger on table "public"."configuration" from "authenticated";

revoke truncate on table "public"."configuration" from "authenticated";

revoke delete on table "public"."contact_notes" from "anon";

revoke insert on table "public"."contact_notes" from "anon";

revoke references on table "public"."contact_notes" from "anon";

revoke select on table "public"."contact_notes" from "anon";

revoke trigger on table "public"."contact_notes" from "anon";

revoke truncate on table "public"."contact_notes" from "anon";

revoke update on table "public"."contact_notes" from "anon";

revoke references on table "public"."contact_notes" from "authenticated";

revoke trigger on table "public"."contact_notes" from "authenticated";

revoke truncate on table "public"."contact_notes" from "authenticated";

revoke delete on table "public"."contacts" from "anon";

revoke insert on table "public"."contacts" from "anon";

revoke references on table "public"."contacts" from "anon";

revoke select on table "public"."contacts" from "anon";

revoke trigger on table "public"."contacts" from "anon";

revoke truncate on table "public"."contacts" from "anon";

revoke update on table "public"."contacts" from "anon";

revoke references on table "public"."contacts" from "authenticated";

revoke trigger on table "public"."contacts" from "authenticated";

revoke truncate on table "public"."contacts" from "authenticated";

revoke delete on table "public"."deal_notes" from "anon";

revoke insert on table "public"."deal_notes" from "anon";

revoke references on table "public"."deal_notes" from "anon";

revoke select on table "public"."deal_notes" from "anon";

revoke trigger on table "public"."deal_notes" from "anon";

revoke truncate on table "public"."deal_notes" from "anon";

revoke update on table "public"."deal_notes" from "anon";

revoke references on table "public"."deal_notes" from "authenticated";

revoke trigger on table "public"."deal_notes" from "authenticated";

revoke truncate on table "public"."deal_notes" from "authenticated";

revoke delete on table "public"."deals" from "anon";

revoke insert on table "public"."deals" from "anon";

revoke references on table "public"."deals" from "anon";

revoke select on table "public"."deals" from "anon";

revoke trigger on table "public"."deals" from "anon";

revoke truncate on table "public"."deals" from "anon";

revoke update on table "public"."deals" from "anon";

revoke references on table "public"."deals" from "authenticated";

revoke trigger on table "public"."deals" from "authenticated";

revoke truncate on table "public"."deals" from "authenticated";

revoke delete on table "public"."favicons_excluded_domains" from "anon";

revoke insert on table "public"."favicons_excluded_domains" from "anon";

revoke references on table "public"."favicons_excluded_domains" from "anon";

revoke select on table "public"."favicons_excluded_domains" from "anon";

revoke trigger on table "public"."favicons_excluded_domains" from "anon";

revoke truncate on table "public"."favicons_excluded_domains" from "anon";

revoke update on table "public"."favicons_excluded_domains" from "anon";

revoke references on table "public"."favicons_excluded_domains" from "authenticated";

revoke trigger on table "public"."favicons_excluded_domains" from "authenticated";

revoke truncate on table "public"."favicons_excluded_domains" from "authenticated";

revoke delete on table "public"."lost_reasons" from "anon";

revoke insert on table "public"."lost_reasons" from "anon";

revoke references on table "public"."lost_reasons" from "anon";

revoke select on table "public"."lost_reasons" from "anon";

revoke trigger on table "public"."lost_reasons" from "anon";

revoke truncate on table "public"."lost_reasons" from "anon";

revoke update on table "public"."lost_reasons" from "anon";

revoke references on table "public"."lost_reasons" from "authenticated";

revoke trigger on table "public"."lost_reasons" from "authenticated";

revoke truncate on table "public"."lost_reasons" from "authenticated";

revoke delete on table "public"."sales" from "anon";

revoke insert on table "public"."sales" from "anon";

revoke references on table "public"."sales" from "anon";

revoke select on table "public"."sales" from "anon";

revoke trigger on table "public"."sales" from "anon";

revoke truncate on table "public"."sales" from "anon";

revoke update on table "public"."sales" from "anon";

revoke references on table "public"."sales" from "authenticated";

revoke trigger on table "public"."sales" from "authenticated";

revoke truncate on table "public"."sales" from "authenticated";

revoke update on table "public"."sales" from "authenticated";

revoke delete on table "public"."sales_absences" from "anon";

revoke insert on table "public"."sales_absences" from "anon";

revoke references on table "public"."sales_absences" from "anon";

revoke select on table "public"."sales_absences" from "anon";

revoke trigger on table "public"."sales_absences" from "anon";

revoke truncate on table "public"."sales_absences" from "anon";

revoke update on table "public"."sales_absences" from "anon";

revoke references on table "public"."sales_absences" from "authenticated";

revoke trigger on table "public"."sales_absences" from "authenticated";

revoke truncate on table "public"."sales_absences" from "authenticated";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

revoke delete on table "public"."tasks" from "anon";

revoke insert on table "public"."tasks" from "anon";

revoke references on table "public"."tasks" from "anon";

revoke select on table "public"."tasks" from "anon";

revoke trigger on table "public"."tasks" from "anon";

revoke truncate on table "public"."tasks" from "anon";

revoke update on table "public"."tasks" from "anon";

revoke references on table "public"."tasks" from "authenticated";

revoke trigger on table "public"."tasks" from "authenticated";

revoke truncate on table "public"."tasks" from "authenticated";

alter table "public"."business_lines" drop constraint "business_lines_owner_sales_id_fkey";

alter table "public"."business_lines" drop constraint "business_lines_substitute_sales_id_fkey";

alter table "public"."deals" drop constraint "deals_lost_reason_id_fkey";

alter table "public"."deals" drop constraint "deals_previous_deal_id_fkey";

alter table "public"."sales_absences" drop constraint "sales_absences_sales_id_fkey";

drop view if exists "public"."activity_log";

CREATE INDEX business_lines_owner_sales_id_idx ON public.business_lines USING btree (owner_sales_id);

CREATE INDEX business_lines_substitute_sales_id_idx ON public.business_lines USING btree (substitute_sales_id);

CREATE INDEX contacts_sales_id_idx ON public.contacts USING btree (sales_id);

CREATE INDEX deals_lost_reason_id_idx ON public.deals USING btree (lost_reason_id) WHERE (lost_reason_id IS NOT NULL);

CREATE INDEX deals_previous_deal_id_idx ON public.deals USING btree (previous_deal_id) WHERE (previous_deal_id IS NOT NULL);

CREATE INDEX deals_unassigned_idx ON public.deals USING btree (created_at) WHERE ((sales_id IS NULL) AND (archived_at IS NULL));

CREATE INDEX sales_absences_sales_id_idx ON public.sales_absences USING btree (sales_id, starts_on, ends_on);

CREATE INDEX tasks_contact_id_idx ON public.tasks USING btree (contact_id);

alter table "public"."business_lines" add constraint "business_lines_owner_sales_id_fkey" FOREIGN KEY (owner_sales_id) REFERENCES public.sales(id) ON DELETE RESTRICT not valid;

alter table "public"."business_lines" validate constraint "business_lines_owner_sales_id_fkey";

alter table "public"."business_lines" add constraint "business_lines_substitute_sales_id_fkey" FOREIGN KEY (substitute_sales_id) REFERENCES public.sales(id) ON DELETE RESTRICT not valid;

alter table "public"."business_lines" validate constraint "business_lines_substitute_sales_id_fkey";

alter table "public"."deals" add constraint "deals_lost_reason_id_fkey" FOREIGN KEY (lost_reason_id) REFERENCES public.lost_reasons(id) ON DELETE RESTRICT not valid;

alter table "public"."deals" validate constraint "deals_lost_reason_id_fkey";

alter table "public"."deals" add constraint "deals_previous_deal_id_fkey" FOREIGN KEY (previous_deal_id) REFERENCES public.deals(id) ON DELETE SET NULL not valid;

alter table "public"."deals" validate constraint "deals_previous_deal_id_fkey";

alter table "public"."sales_absences" add constraint "sales_absences_sales_id_fkey" FOREIGN KEY (sales_id) REFERENCES public.sales(id) ON DELETE RESTRICT not valid;

alter table "public"."sales_absences" validate constraint "sales_absences_sales_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_active_manager()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.guard_deal_contact_ids()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.protect_contact_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

create or replace view "public"."activity_log" with (security_invoker = on) as  SELECT (('company.'::text || c.id) || '.created'::text) AS id,
    'company.created'::text AS type,
    c.created_at AS date,
    c.id AS company_id,
    c.sales_id,
    ((to_jsonb(c.*) - 'fts'::text))::json AS company,
    NULL::json AS contact,
    NULL::json AS deal,
    NULL::json AS contact_note,
    NULL::json AS deal_note
   FROM public.companies c
UNION ALL
 SELECT (('contact.'::text || co.id) || '.created'::text) AS id,
    'contact.created'::text AS type,
    co.first_seen AS date,
    co.company_id,
    co.sales_id,
    NULL::json AS company,
    ((to_jsonb(co.*) - 'fts'::text))::json AS contact,
    NULL::json AS deal,
    NULL::json AS contact_note,
    NULL::json AS deal_note
   FROM public.contacts co
UNION ALL
 SELECT (('contactNote.'::text || cn.id) || '.created'::text) AS id,
    'contactNote.created'::text AS type,
    cn.date,
    co.company_id,
    cn.sales_id,
    NULL::json AS company,
    NULL::json AS contact,
    NULL::json AS deal,
    ((to_jsonb(cn.*) - 'fts'::text))::json AS contact_note,
    NULL::json AS deal_note
   FROM (public.contact_notes cn
     LEFT JOIN public.contacts co ON ((co.id = cn.contact_id)))
UNION ALL
 SELECT (('deal.'::text || d.id) || '.created'::text) AS id,
    'deal.created'::text AS type,
    d.created_at AS date,
    d.company_id,
    d.sales_id,
    NULL::json AS company,
    NULL::json AS contact,
    (((to_jsonb(d.*) - 'fts'::text) - 'raw_source'::text))::json AS deal,
    NULL::json AS contact_note,
    NULL::json AS deal_note
   FROM public.deals d
UNION ALL
 SELECT (('dealNote.'::text || dn.id) || '.created'::text) AS id,
    'dealNote.created'::text AS type,
    dn.date,
    d.company_id,
    dn.sales_id,
    NULL::json AS company,
    NULL::json AS contact,
    NULL::json AS deal,
    NULL::json AS contact_note,
    ((to_jsonb(dn.*) - 'fts'::text))::json AS deal_note
   FROM (public.deal_notes dn
     LEFT JOIN public.deals d ON ((d.id = dn.deal_id)));


CREATE OR REPLACE FUNCTION public.can_edit_contact(contact_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.can_edit_deal(deal_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select (select public.is_manager()) or exists (
    select 1 from public.deals d
    where d.id = deal_id and d.sales_id = (select public.current_sales_id())
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_internal_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select (select public.current_user_role()) is not null
$function$
;

CREATE OR REPLACE FUNCTION public.is_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce((select public.current_user_role()) = 'manager', false)
$function$
;

CREATE OR REPLACE FUNCTION public.protect_sales_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
   where id = deal_id and sales_id is null and archived_at is null and stage <> 'archivado'
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
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "business_lines_write"
  on "public"."business_lines"
  as permissive
  for all
  to authenticated
using (( SELECT public.is_manager() AS is_manager))
with check (( SELECT public.is_manager() AS is_manager));



  create policy "companies_delete"
  on "public"."companies"
  as permissive
  for delete
  to authenticated
using (( SELECT public.is_manager() AS is_manager));



  create policy "companies_insert"
  on "public"."companies"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "companies_select"
  on "public"."companies"
  as permissive
  for select
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "companies_update"
  on "public"."companies"
  as permissive
  for update
  to authenticated
using ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])))
with check ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "configuration_insert"
  on "public"."configuration"
  as permissive
  for insert
  to authenticated
with check (( SELECT public.is_manager() AS is_manager));



  create policy "configuration_select"
  on "public"."configuration"
  as permissive
  for select
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "configuration_update"
  on "public"."configuration"
  as permissive
  for update
  to authenticated
using (( SELECT public.is_manager() AS is_manager))
with check (( SELECT public.is_manager() AS is_manager));



  create policy "contacts_delete"
  on "public"."contacts"
  as permissive
  for delete
  to authenticated
using (( SELECT public.is_manager() AS is_manager));



  create policy "contacts_insert"
  on "public"."contacts"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "contacts_select"
  on "public"."contacts"
  as permissive
  for select
  to authenticated
using (((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'reader'::public.user_role])) OR (sales_id = ( SELECT public.current_sales_id() AS current_sales_id)) OR (EXISTS ( SELECT 1
   FROM public.deals d
  WHERE (d.contact_ids @> ARRAY[contacts.id])))));



  create policy "deals_insert"
  on "public"."deals"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.is_manager() AS is_manager) OR ((( SELECT public.current_user_role() AS current_user_role) = 'executive'::public.user_role) AND (sales_id = ( SELECT public.current_sales_id() AS current_sales_id)))));



  create policy "deals_select"
  on "public"."deals"
  as permissive
  for select
  to authenticated
using (((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'reader'::public.user_role])) OR (sales_id = ( SELECT public.current_sales_id() AS current_sales_id)) OR ((sales_id IS NULL) AND (( SELECT public.current_user_role() AS current_user_role) = 'executive'::public.user_role))));



  create policy "deals_update"
  on "public"."deals"
  as permissive
  for update
  to authenticated
using ((( SELECT public.is_manager() AS is_manager) OR (sales_id = ( SELECT public.current_sales_id() AS current_sales_id))))
with check ((( SELECT public.is_manager() AS is_manager) OR (sales_id = ( SELECT public.current_sales_id() AS current_sales_id))));



  create policy "favicons_excluded_domains_all"
  on "public"."favicons_excluded_domains"
  as permissive
  for all
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user))
with check (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "lost_reasons_select"
  on "public"."lost_reasons"
  as permissive
  for select
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "lost_reasons_write"
  on "public"."lost_reasons"
  as permissive
  for all
  to authenticated
using (( SELECT public.is_manager() AS is_manager))
with check (( SELECT public.is_manager() AS is_manager));



  create policy "sales_select"
  on "public"."sales"
  as permissive
  for select
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "sales_update"
  on "public"."sales"
  as permissive
  for update
  to authenticated
using ((( SELECT public.is_manager() AS is_manager) OR (id = ( SELECT public.current_sales_id() AS current_sales_id))))
with check ((( SELECT public.is_manager() AS is_manager) OR (id = ( SELECT public.current_sales_id() AS current_sales_id))));



  create policy "sales_absences_select"
  on "public"."sales_absences"
  as permissive
  for select
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "sales_absences_write"
  on "public"."sales_absences"
  as permissive
  for all
  to authenticated
using (( SELECT public.is_manager() AS is_manager))
with check (( SELECT public.is_manager() AS is_manager));



  create policy "tags_delete"
  on "public"."tags"
  as permissive
  for delete
  to authenticated
using ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "tags_insert"
  on "public"."tags"
  as permissive
  for insert
  to authenticated
with check ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));



  create policy "tags_select"
  on "public"."tags"
  as permissive
  for select
  to authenticated
using (( SELECT public.is_internal_user() AS is_internal_user));



  create policy "tags_update"
  on "public"."tags"
  as permissive
  for update
  to authenticated
using ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])))
with check ((( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role])));


CREATE TRIGGER protect_contact_owner_trigger BEFORE INSERT OR UPDATE OF sales_id ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.protect_contact_owner();

CREATE TRIGGER guard_deal_contact_ids_trigger BEFORE INSERT OR UPDATE OF contact_ids ON public.deals FOR EACH ROW EXECUTE FUNCTION public.guard_deal_contact_ids();

CREATE TRIGGER ensure_active_manager_trigger AFTER UPDATE OF role, administrator, disabled ON public.sales FOR EACH ROW EXECUTE FUNCTION public.ensure_active_manager();

drop policy "Attachments 1mt4rzk_0" on "storage"."objects";

drop policy "Attachments 1mt4rzk_1" on "storage"."objects";

drop policy "Attachments 1mt4rzk_3" on "storage"."objects";


  create policy "attachments_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'attachments'::text) AND (( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role]))));



  create policy "attachments_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'attachments'::text) AND (( SELECT public.current_user_role() AS current_user_role) = ANY (ARRAY['manager'::public.user_role, 'executive'::public.user_role]))));



  create policy "attachments_select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'attachments'::text) AND ( SELECT public.is_internal_user() AS is_internal_user)));




-- migra no emite los privilegios por defecto (06_grants.sql): agregados a mano.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- migra tampoco emite grants por columna, grants de funciones ni revokes sobre
-- vistas y secuencias: agregados a mano desde 12_tekfusion_grants.sql.
revoke all on table public.activity_log, public.companies_summary, public.contacts_summary from anon;
revoke all on all sequences in schema public from anon;
grant update (first_name, last_name, avatar, signature, whatsapp_phone, role, administrator, disabled)
    on table public.sales to authenticated;
revoke execute on function public.take_deal(bigint) from public, anon;
revoke execute on function public.current_sales_id() from public, anon;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_manager() from public, anon;
revoke execute on function public.is_internal_user() from public, anon;
revoke execute on function public.can_edit_deal(bigint) from public, anon;
revoke execute on function public.can_edit_contact(bigint) from public, anon;
grant execute on function public.take_deal(bigint) to authenticated, service_role;
grant execute on function public.current_sales_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_manager() to authenticated, service_role;
grant execute on function public.is_internal_user() to authenticated, service_role;
grant execute on function public.can_edit_deal(bigint) to authenticated, service_role;
grant execute on function public.can_edit_contact(bigint) to authenticated, service_role;
revoke truncate, references, trigger on table public.activity_log, public.companies_summary, public.contacts_summary, public.init_state from authenticated;
