-- Realtime for the WhatsApp inbox (docs/07, Bandeja; docs/10): publish
-- wa_conversations and wa_messages so the CRM can listen to postgres_changes.
-- Realtime applies the select policies of each subscriber (35_rls_whatsapp),
-- which do not change here. wa_message_payloads and wa_instance_status stay
-- out of the publication. Written by hand: `db diff` does not see publications.

alter publication supabase_realtime add table public.wa_conversations, public.wa_messages;
