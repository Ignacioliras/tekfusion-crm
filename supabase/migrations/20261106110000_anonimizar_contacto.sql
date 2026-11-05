-- RF-17 (Ley 21.719, docs/08): "Anonimizar contacto" (gerencia) y retención
-- programada con pg_cron. Written by hand: db diff emits no grants and does
-- not see cron jobs.

-- Shared by anonymize_contact() and anonymize_expired_contacts(); not callable
-- through the API. Replaces the personal data of a contact, empties its notes
-- (and the notes of the leads that only have this contact) and returns the
-- Storage paths (bucket attachments) of the files those notes held. Leads,
-- amounts, stages and dates are left untouched: the metrics survive.
CREATE OR REPLACE FUNCTION "public"."anonymize_contact_data"("target_id" bigint, "actor_id" bigint) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  sole_deals bigint[];
  paths text[];
begin
  update public.contacts
     set first_name = 'Contacto', last_name = 'anonimizado #' || id,
         email_jsonb = '[]'::jsonb, phone_jsonb = '[]'::jsonb,
         avatar = null, title = null, background = null, linkedin_url = null
   where id = target_id;
  if not found then
    raise exception 'contact % does not exist', target_id using errcode = 'P0002';
  end if;

  select coalesce(array_agg(d.id), '{}') into sole_deals
    from public.deals d
   where d.contact_ids @> array[target_id] and d.contact_ids <@ array[target_id];

  select coalesce(array_agg(f.file ->> 'path') filter (where f.file ->> 'path' is not null), '{}') into paths
    from (
      select unnest(n.attachments) as file from public.contact_notes n where n.contact_id = target_id
      union all
      select unnest(n.attachments) from public.deal_notes n where n.deal_id = any (sole_deals)
    ) f;

  update public.contact_notes set text = '[contenido anonimizado]', attachments = '{}'
   where contact_id = target_id;
  update public.deal_notes set text = '[contenido anonimizado]', attachments = '{}'
   where deal_id = any (sole_deals);

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
-- with no activity for configuration.config.dataRetentionMonths months (24 by
-- default, 0 = off). Contacts without leads are left alone. Run daily by
-- pg_cron; never by an API session (same auth.role() rule as offboard_sale).
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
     where (c.first_name, c.last_name) is distinct from ('Contacto', 'anonimizado #' || c.id)
       and exists (select 1 from public.deals d where d.contact_ids @> array[c.id])
       and not exists (
         select 1 from public.deals d
          where d.contact_ids @> array[c.id]
            and (d.stage not in ('perdido', 'archivado') or d.last_activity_at >= cutoff))
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
