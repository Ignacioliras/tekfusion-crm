-- RF-17 (Ley 21.719, docs/08): "Anonimizar contacto" (gerencia) y retención
-- programada con pg_cron. Written by hand: db diff emits no grants and does
-- not see cron jobs.

-- Shared by anonymize_contact() and anonymize_expired_contacts(); not callable
-- through the API. Replaces the personal data of a contact and stamps
-- anonymized_at (how an anonymized contact is recognized); empties its notes
-- and tasks and, for the leads that only have this contact, their notes,
-- raw_source, follow-up texts and alert messages. Returns the Storage paths
-- (bucket attachments) of the files those notes held. A contact already
-- anonymized is left as it is ('{}'). A lead shared with another contact is
-- not touched (Ignacio, 2026-11-05). Amounts, stages and dates stay: the
-- metrics survive.
-- Left untouched on purpose: deals.name, deals.description and quotes with
-- their PDF. Pending decision of TekFusion (docs/10, 2026-11-05).
CREATE OR REPLACE FUNCTION "public"."anonymize_contact_data"("target_id" bigint, "actor_id" bigint) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  placeholder constant text := '[contenido anonimizado]';
  done_at timestamp with time zone;
  sole_deals bigint[];
  paths text[];
begin
  select c.anonymized_at into done_at from public.contacts c where c.id = target_id for update;
  if not found then
    raise exception 'contact % does not exist', target_id using errcode = 'P0002';
  end if;
  if done_at is not null then
    return '{}';
  end if;

  update public.contacts
     set first_name = 'Contacto', last_name = 'anonimizado #' || id,
         email_jsonb = '[]'::jsonb, phone_jsonb = '[]'::jsonb,
         avatar = null, title = null, background = null, linkedin_url = null,
         gender = null, anonymized_at = now()
   where id = target_id;

  select coalesce(array_agg(d.id), '{}') into sole_deals
    from public.deals d
   where d.contact_ids @> array[target_id] and d.contact_ids <@ array[target_id];

  select coalesce(array_agg(f.file ->> 'path') filter (where f.file ->> 'path' is not null), '{}') into paths
    from (
      select unnest(n.attachments) as file from public.contact_notes n where n.contact_id = target_id
      union all
      select unnest(n.attachments) from public.deal_notes n where n.deal_id = any (sole_deals)
    ) f;

  update public.contact_notes set text = placeholder, attachments = '{}'
   where contact_id = target_id;
  update public.tasks set text = placeholder where contact_id = target_id;
  update public.deal_notes set text = placeholder, attachments = '{}'
   where deal_id = any (sole_deals);
  update public.deals set raw_source = null
   where id = any (sole_deals) and raw_source is not null;
  -- messages keeps its shape (channel -> template_id, subject, body): only the
  -- texts go. Rebuilt key by key so nothing else written there survives.
  update public.followups f
     set messages = (
       select jsonb_object_agg(m.key,
                jsonb_build_object('template_id', m.value -> 'template_id', 'body', placeholder)
                || case when m.key = 'correo' then jsonb_build_object('subject', placeholder) else '{}'::jsonb end)
         from jsonb_each(f.messages) m)
   where f.deal_id = any (sole_deals) and f.messages <> '{}'::jsonb;
  -- alerts only point to a lead (they have no contact column).
  update public.alerts set message = placeholder where deal_id = any (sole_deals);

  insert into public.audit_log (actor_sales_id, action, details)
  values (actor_id, 'contact.anonymized',
          jsonb_build_object('contact_id', target_id, 'attachments', cardinality(paths)));
  return paths;
end;
$$;

-- "Anonimizar contacto": managers only. The interface removes the returned
-- paths from Storage.
CREATE OR REPLACE FUNCTION "public"."anonymize_contact"("contact_id" bigint) RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_manager() then
    raise exception 'only managers anonymize contacts' using errcode = '42501';
  end if;
  return public.anonymize_contact_data(contact_id, public.current_sales_id());
end;
$$;

-- Retention: anonymizes every contact whose leads are all perdido/archivado
-- and that shows no activity for configuration.config.dataRetentionMonths
-- months (24 by default, 0 = off). Any activity since the cutoff keeps the
-- contact out (Ignacio, 2026-11-05): last_activity_at of one of its leads, a
-- note of the contact or of one of its leads (notes only have "date"), or a
-- task of the contact (tasks only have created_at).
-- TODO Fases 4 and 5: wa_messages and emails count as activity too; add them
-- here when those tables exist.
-- Contacts without leads are left alone. Run daily by pg_cron; never by an API
-- session (same auth.role() rule as offboard_sale).
CREATE OR REPLACE FUNCTION "public"."anonymize_expired_contacts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  retention_months integer;
  cutoff timestamp with time zone;
  expired record;
  total integer := 0;
begin
  if auth.role() is not null and auth.role() <> 'service_role' then
    raise exception 'anonymize_expired_contacts is run by the scheduler' using errcode = '42501';
  end if;
  select (c.config ->> 'dataRetentionMonths')::integer into retention_months
    from public.configuration c where c.id = 1;
  retention_months := coalesce(retention_months, 24);
  if retention_months <= 0 then
    return 0;
  end if;
  cutoff := now() - make_interval(months => retention_months);
  for expired in
    select c.id from public.contacts c
     where c.anonymized_at is null
       and exists (select 1 from public.deals d where d.contact_ids @> array[c.id])
       and not exists (
         select 1 from public.deals d
          where d.contact_ids @> array[c.id]
            and (d.stage not in ('perdido', 'archivado') or d.last_activity_at >= cutoff))
       and not exists (
         select 1 from public.contact_notes n where n.contact_id = c.id and n.date >= cutoff)
       and not exists (
         select 1 from public.deal_notes n
           join public.deals d on d.id = n.deal_id
          where d.contact_ids @> array[c.id] and n.date >= cutoff)
       and not exists (
         select 1 from public.tasks t where t.contact_id = c.id and t.created_at >= cutoff)
  loop
    perform public.anonymize_contact_data(expired.id, null);
    total := total + 1;
  end loop;
  insert into public.audit_log (action, details)
  values ('retention.run', jsonb_build_object('contacts', total, 'months', retention_months));
  return total;
end;
$$;

revoke execute on function public.anonymize_contact_data(bigint, bigint) from public, anon, authenticated, service_role;
revoke execute on function public.anonymize_contact(bigint) from public, anon;
grant execute on function public.anonymize_contact(bigint) to authenticated, service_role;
revoke execute on function public.anonymize_expired_contacts() from public, anon, authenticated;
grant execute on function public.anonymize_expired_contacts() to service_role;

-- Daily at 07:00 UTC (early morning in Chile). Idempotent.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'anonimizar-retencion';
select cron.schedule('anonimizar-retencion', '0 7 * * *', 'select public.anonymize_expired_contacts()');
