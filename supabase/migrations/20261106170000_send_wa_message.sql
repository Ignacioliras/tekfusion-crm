-- send_wa_message: write a text from the WhatsApp inbox (stored as pendiente
-- and enqueued; nothing is sent yet). Written by hand, same text as
-- supabase/schemas/14_tekfusion_whatsapp.sql.

-- A queue row now targets either a quote (with its lead, as before) or one
-- wa_messages row over WhatsApp.
alter table public.send_queue
    alter column deal_id drop not null,
    alter column quote_id drop not null,
    add column message_id bigint references public.wa_messages (id) on delete restrict,
    add constraint send_queue_message_key unique (message_id),
    add constraint send_queue_target_check check (
        (quote_id is not null and deal_id is not null and message_id is null)
        or (quote_id is null and message_id is not null and channel = 'whatsapp'));

CREATE OR REPLACE FUNCTION "public"."send_wa_message"("conversation_id" bigint, "text" "text") RETURNS "public"."wa_messages"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  -- Longest text body WhatsApp accepts in one message.
  max_text_length constant integer := 4096;
  me bigint := public.current_sales_id();
  my_role text := public.current_user_role();
  body text := btrim(send_wa_message.text, E' \t\n\r');
  job text := 'crm-' || gen_random_uuid()::text;
  conv public.wa_conversations;
  msg public.wa_messages;
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
  if body is null or body = '' then
    raise exception 'the message text is empty' using errcode = '22023';
  end if;
  if char_length(body) > max_text_length then
    raise exception 'the message text is longer than % characters', max_text_length using errcode = '22023';
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

-- Logged-in users only (the function needs a sales row; the service role has none).
revoke execute on function public.send_wa_message(bigint, text) from public, anon, service_role;
grant execute on function public.send_wa_message(bigint, text) to authenticated;
