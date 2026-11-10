-- Decisiones de Ignacio del 2026-11-09 tras probar la cola nocturna 2026-11-09
-- (docs/10-decisiones.md):
--   * send_wa_message rechaza una conversación sin asignar también para
--     gerencia (42501): primero se toma (take_wa_conversation).
--   * anonymize_contact_data archiva las conversaciones de WhatsApp del
--     contacto: send_wa_message ya rechaza una archivada (P0002), así que nadie
--     vuelve a escribir en ellas.
-- Generada con `db diff` y limpiada de los fantasmas de siempre (drop de
-- pg_cron y pgjwt, y las seis vistas recreadas sin security_invoker): quedan
-- solo las dos funciones. Los grants no cambian (create or replace los conserva).
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.anonymize_contact_data(target_id bigint, actor_id bigint)
 RETURNS text[]
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  update public.wa_conversations set phone = 'anon-' || id, archived = true where contact_id = target_id;

  insert into public.audit_log (actor_sales_id, action, details)
  values (actor_id, 'contact.anonymized',
          jsonb_build_object('contact_id', target_id, 'attachments', cardinality(paths)));
  return paths;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.send_wa_message(conversation_id bigint, text text)
 RETURNS public.wa_messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  -- Longest text body WhatsApp accepts in one message.
  max_text_length constant integer := 4096;
  -- Cap of texts one user writes from the CRM (a runaway client, not the
  -- anti-block pacing, which belongs to the sender: docs/07).
  max_messages_per_window constant integer := 30;
  rate_window constant interval := interval '1 minute';
  me bigint := public.current_sales_id();
  my_role text := public.current_user_role();
  body text := btrim(send_wa_message.text, E' \t\n\r');
  job text := 'crm-' || gen_random_uuid()::text;
  conv public.wa_conversations;
  msg public.wa_messages;
  recent integer;
begin
  if me is null or my_role not in ('manager', 'executive') then
    raise exception 'only executives and managers can send messages' using errcode = '42501';
  end if;
  select * into conv
    from public.wa_conversations c
   where c.id = send_wa_message.conversation_id
     for update;
  if not found then
    raise exception 'conversation % does not exist', send_wa_message.conversation_id using errcode = 'P0002';
  end if;
  if conv.sales_id is null then
    raise exception 'conversation % is unassigned: take it before writing', conv.id using errcode = '42501';
  end if;
  if my_role <> 'manager' and conv.sales_id <> me then
    raise exception 'conversation % is not assigned to you', conv.id using errcode = '42501';
  end if;
  if conv.archived then
    raise exception 'conversation % is archived', conv.id using errcode = 'P0002';
  end if;
  if body is null or body = '' then
    raise exception 'the message text is empty' using errcode = '22023';
  end if;
  if char_length(body) > max_text_length then
    raise exception 'the message text is longer than % characters', max_text_length using errcode = '22023';
  end if;
  -- One sender at a time per user: without it, parallel calls on different
  -- conversations would each count before the others commit and go over the cap.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('send_wa_message:' || me, 0));
  select count(*) into recent
    from public.wa_messages m
   where m.author_sales_id = me and m.origin = 'crm' and m.created_at > now() - rate_window;
  if recent >= max_messages_per_window then
    raise exception 'rate limit: at most % messages per minute', max_messages_per_window using errcode = 'PT429';
  end if;

  insert into public.wa_messages (conversation_id, deal_id, wa_message_id, direction, type, text, status, origin, author_sales_id, job_id, sent_at)
  values (conv.id, conv.active_deal_id, 'pending:' || job, 'saliente', 'texto', body, 'pendiente', 'crm', me, job, now())
  returning * into msg;

  insert into public.send_queue (deal_id, message_id, channel, sales_id)
  values (conv.active_deal_id, msg.id, 'whatsapp', me);

  update public.wa_conversations c
     set last_message_at = greatest(c.last_message_at, msg.sent_at)
   where c.id = conv.id;
  return msg;
end;
$function$
;
