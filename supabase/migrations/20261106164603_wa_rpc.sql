-- Inbox RPCs for WhatsApp (take and mark as read). Generated with db diff and
-- cleaned: without the phantom pg_cron/pgjwt drops and view recreations.
-- db diff does not emit function grants: written by hand.
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.mark_wa_conversation_read(conversation_id bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me bigint := public.current_sales_id();
  my_role text := public.current_user_role();
  owner bigint;
  marked integer;
begin
  if me is null or my_role not in ('manager', 'executive') then
    raise exception 'only executives and managers can read conversations' using errcode = '42501';
  end if;
  select c.sales_id into owner
    from public.wa_conversations c
   where c.id = mark_wa_conversation_read.conversation_id
     for update;
  if not found then
    raise exception 'conversation % does not exist', mark_wa_conversation_read.conversation_id using errcode = 'P0002';
  end if;
  if owner is null then
    return 0;
  end if;
  if my_role <> 'manager' and owner <> me then
    raise exception 'conversation % belongs to another executive', mark_wa_conversation_read.conversation_id using errcode = '42501';
  end if;
  update public.wa_messages m
     set status = 'leido'
   where m.conversation_id = mark_wa_conversation_read.conversation_id
     and m.direction = 'entrante' and m.status <> 'leido';
  get diagnostics marked = row_count;
  update public.wa_conversations c
     set unread_count = 0
   where c.id = mark_wa_conversation_read.conversation_id;
  return marked;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.take_wa_conversation(conversation_id bigint)
 RETURNS public.wa_conversations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me bigint := public.current_sales_id();
  taken public.wa_conversations;
begin
  if me is null or public.current_user_role() not in ('manager', 'executive') then
    raise exception 'only executives and managers can take a conversation' using errcode = '42501';
  end if;
  update public.wa_conversations c
     set sales_id = me
   where c.id = take_wa_conversation.conversation_id and c.sales_id is null and not c.archived
   returning * into taken;
  if not found then
    raise exception 'conversation % is not available', take_wa_conversation.conversation_id using errcode = 'P0002';
  end if;
  return taken;
end;
$function$
;

revoke execute on function public.take_wa_conversation(bigint) from public, anon, service_role;
grant execute on function public.take_wa_conversation(bigint) to authenticated;
revoke execute on function public.mark_wa_conversation_read(bigint) from public, anon, service_role;
grant execute on function public.mark_wa_conversation_read(bigint) to authenticated;
