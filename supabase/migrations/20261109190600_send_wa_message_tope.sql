-- send_wa_message: no writing in archived conversations (P0002) and at most 30
-- texts per user per minute (PT429 -> HTTP 429). Generated with db diff; the
-- usual ghosts (drop of pg_cron/pgjwt, views recreated without
-- security_invoker) were removed by hand. Function text as in
-- supabase/schemas/14_tekfusion_whatsapp.sql.

CREATE INDEX wa_messages_author_created_idx ON public.wa_messages USING btree (author_sales_id, created_at);

CREATE OR REPLACE FUNCTION "public"."send_wa_message"("conversation_id" bigint, "text" "text") RETURNS "public"."wa_messages"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  if my_role <> 'manager' and conv.sales_id is distinct from me then
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
$$;
