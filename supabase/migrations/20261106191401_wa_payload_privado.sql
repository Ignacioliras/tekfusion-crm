-- The raw webhook body leaves wa_messages (readable through the API by whoever
-- sees the conversation) for wa_message_payloads, closed to every API role but
-- the service role: Evolution adds the instance apikey and server_url to each
-- event (docs/10). Generated with `db diff` and cleaned by hand: without its
-- phantoms (pg_cron, pgjwt, views recreated without security_invoker), with
-- the copy of the existing payloads and with the revoke that migra does not
-- emit (default privileges would give authenticated full DML on a new table).

create table "public"."wa_message_payloads" (
    "message_id" bigint not null,
    "payload" jsonb not null
);

alter table "public"."wa_message_payloads" enable row level security;

CREATE UNIQUE INDEX wa_message_payloads_pkey ON public.wa_message_payloads USING btree (message_id);

alter table "public"."wa_message_payloads" add constraint "wa_message_payloads_pkey" PRIMARY KEY using index "wa_message_payloads_pkey";

alter table "public"."wa_message_payloads" add constraint "wa_message_payloads_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.wa_messages(id) ON DELETE CASCADE not valid;

alter table "public"."wa_message_payloads" validate constraint "wa_message_payloads_message_id_fkey";

revoke all on table "public"."wa_message_payloads" from "authenticated", "anon";

grant all on table "public"."wa_message_payloads" to "service_role";

insert into "public"."wa_message_payloads" (message_id, payload)
select id, payload from "public"."wa_messages" where payload is not null;

alter table "public"."wa_messages" drop column "payload";

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

  insert into public.wa_messages (conversation_id, deal_id, wa_message_id, direction, type, text, sent_at, job_id, origin, from_me_phone, author_sales_id)
  values (v_conversation.id, v_conversation.active_deal_id, p_wa_message_id, p_direction, p_type, p_text, p_sent_at, p_job_id,
          case when v_from_phone then 'telefono'::public.wa_message_origin end,
          v_from_phone,
          case when v_from_phone then v_conversation.sales_id end)
  on conflict (wa_message_id) do nothing
  returning id into v_message_id;

  if v_message_id is null then
    select m.id into v_message_id from public.wa_messages m where m.wa_message_id = p_wa_message_id;
    return jsonb_build_object('conversation_id', v_conversation.id, 'message_id', v_message_id, 'inserted', false);
  end if;

  if p_payload is not null then
    insert into public.wa_message_payloads (message_id, payload) values (v_message_id, p_payload);
  end if;

  update public.wa_conversations
  set last_message_at = greatest(last_message_at, p_sent_at),
      unread_count = unread_count + case when p_direction = 'entrante' then 1 else 0 end
  where id = v_conversation.id;

  return jsonb_build_object('conversation_id', v_conversation.id, 'message_id', v_message_id, 'inserted', true);
end;
$function$
;
