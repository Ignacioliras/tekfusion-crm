-- Fase 4 🔒: policies de wa_conversations y wa_messages (docs/08; docs/10;
-- supabase/schemas/14_tekfusion_whatsapp.sql). Generada con `db diff` y
-- revisada a mano: se quitaron los drop de pg_cron y pgjwt y la recreación de
-- las vistas sin cambios (activity_log, companies_summary, contacts_summary,
-- dashboard_daily, init_state, sales_ranking), que las dejaba sin
-- security_invoker. Solo select para authenticated; wa_instance_status sigue
-- cerrada.

CREATE INDEX wa_conversations_last_message_at_idx ON public.wa_conversations USING btree (last_message_at DESC);

CREATE INDEX wa_conversations_sales_id_idx ON public.wa_conversations USING btree (sales_id);

grant select on table "public"."wa_conversations" to "authenticated";

grant select on table "public"."wa_messages" to "authenticated";


  create policy "wa_conversations_select"
  on "public"."wa_conversations"
  as permissive
  for select
  to authenticated
using ((( SELECT public.is_manager() AS is_manager) OR ((( SELECT public.current_user_role() AS current_user_role) = 'executive'::public.user_role) AND ((sales_id = ( SELECT public.current_sales_id() AS current_sales_id)) OR (sales_id IS NULL)))));



  create policy "wa_messages_select"
  on "public"."wa_messages"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.wa_conversations c
  WHERE (c.id = wa_messages.conversation_id))));
