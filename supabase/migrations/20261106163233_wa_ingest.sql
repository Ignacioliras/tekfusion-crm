-- WhatsApp ingest functions (docs/07, Receptor; docs/10). Service role only.
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.wa_ingest_message(p_instance text, p_wa_message_id text, p_phone text, p_direction public.wa_direction, p_type public.wa_message_type, p_text text, p_sent_at timestamp with time zone, p_payload jsonb, p_job_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_conversation public.wa_conversations;
  v_message_id bigint;
  v_from_phone boolean := p_direction = 'saliente' and p_job_id is null;
begin
  -- The no-op update locks the conversation row: concurrent messages of the
  -- same number serialize here and unread_count never loses an increment.
  insert into public.wa_conversations (phone) values (p_phone)
  on conflict (phone) do update set phone = excluded.phone
  returning * into v_conversation;

  insert into public.wa_messages (conversation_id, deal_id, wa_message_id, direction, type, text, sent_at, payload, job_id, origin, from_me_phone, author_sales_id)
  values (v_conversation.id, v_conversation.active_deal_id, p_wa_message_id, p_direction, p_type, p_text, p_sent_at, p_payload, p_job_id,
          case when v_from_phone then 'telefono'::public.wa_message_origin end,
          v_from_phone,
          case when v_from_phone then v_conversation.sales_id end)
  on conflict (wa_message_id) do nothing
  returning id into v_message_id;

  if v_message_id is null then
    select m.id into v_message_id from public.wa_messages m where m.wa_message_id = p_wa_message_id;
    return jsonb_build_object('conversation_id', v_conversation.id, 'message_id', v_message_id, 'inserted', false);
  end if;

  update public.wa_conversations
  set last_message_at = greatest(last_message_at, p_sent_at),
      unread_count = unread_count + case when p_direction = 'entrante' then 1 else 0 end
  where id = v_conversation.id;

  return jsonb_build_object('conversation_id', v_conversation.id, 'message_id', v_message_id, 'inserted', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.wa_update_message_status(p_wa_message_id text, p_status public.delivery_status)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.wa_messages m
  set status = p_status
  where m.wa_message_id = p_wa_message_id
    and case when p_status = 'fallido' then m.status in ('pendiente', 'enviado')
             else m.status < p_status end;
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.wa_upsert_instance_status(p_instance text, p_connected boolean, p_event jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  insert into public.wa_instance_status (instance, connected, last_event, updated_at)
  values (p_instance, p_connected, p_event, now())
  on conflict (instance) do update
  set connected = excluded.connected, last_event = excluded.last_event, updated_at = now();
end;
$function$
;

-- Grants by hand (db diff does not emit them).
revoke execute on function public.wa_ingest_message(text, text, text, public.wa_direction, public.wa_message_type, text, timestamp with time zone, jsonb, text) from public, anon, authenticated;
grant execute on function public.wa_ingest_message(text, text, text, public.wa_direction, public.wa_message_type, text, timestamp with time zone, jsonb, text) to service_role;
revoke execute on function public.wa_update_message_status(text, public.delivery_status) from public, anon, authenticated;
grant execute on function public.wa_update_message_status(text, public.delivery_status) to service_role;
revoke execute on function public.wa_upsert_instance_status(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.wa_upsert_instance_status(text, boolean, jsonb) to service_role;
