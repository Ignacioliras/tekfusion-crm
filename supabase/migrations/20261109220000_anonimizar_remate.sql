-- Remate RF-17 (docs/10, 2026-11-09): anonimizar cancela los seguimientos
-- pendientes de los leads del contacto y limpia su WhatsApp (número, textos y
-- cuerpos crudos); la retención también cuenta como actividad una tarea
-- completada y un mensaje de WhatsApp desde el corte. Escrita a mano: las
-- funciones van copiadas de supabase/schemas/11_tekfusion_policies.sql.

alter table public.wa_conversations drop constraint wa_conversations_phone_e164;
alter table public.wa_conversations
    add constraint wa_conversations_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$' or phone ~ '^anon-[0-9]+$');

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
  update public.followups set status = 'cancelado', cancel_reason = 'anonimizado'
   where deal_id = any (sole_deals) and status = 'pendiente';
  -- alerts only point to a lead (they have no contact column).
  update public.alerts set message = placeholder where deal_id = any (sole_deals);

  delete from public.wa_message_payloads p
   using public.wa_messages m, public.wa_conversations w
   where m.id = p.message_id and w.id = m.conversation_id and w.contact_id = target_id;
  update public.wa_messages m set text = null
    from public.wa_conversations w
   where w.id = m.conversation_id and w.contact_id = target_id and m.text is not null;
  update public.wa_conversations set phone = 'anon-' || id where contact_id = target_id;

  insert into public.audit_log (actor_sales_id, action, details)
  values (actor_id, 'contact.anonymized',
          jsonb_build_object('contact_id', target_id, 'attachments', cardinality(paths)));
  return paths;
end;
$$;

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
         select 1 from public.tasks t
          where t.contact_id = c.id and (t.created_at >= cutoff or t.done_date >= cutoff))
       and not exists (
         select 1 from public.wa_messages m
           join public.wa_conversations w on w.id = m.conversation_id
          where w.contact_id = c.id and m.sent_at >= cutoff)
       and not exists (
         select 1 from public.wa_messages m
           join public.deals d on d.id = m.deal_id
          where d.contact_ids @> array[c.id] and m.sent_at >= cutoff)
  loop
    perform public.anonymize_contact_data(expired.id, null);
    total := total + 1;
  end loop;
  insert into public.audit_log (action, details)
  values ('retention.run', jsonb_build_object('contacts', total, 'months', retention_months));
  return total;
end;
$$;
