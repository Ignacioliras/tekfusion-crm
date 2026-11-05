-- fase-3/ajustes: per-channel template and final text of a follow-up (docs/10,
-- 2026-11-05). Trimmed from db diff: no pgjwt drop, no view recreation (the views
-- did not change and would lose security_invoker).
alter table "public"."followups" add column "messages" jsonb not null default '{}'::jsonb;

alter table "public"."followups" add constraint "followups_messages_channels" CHECK (((jsonb_typeof(messages) = 'object'::text) AND ((messages - ARRAY['correo'::text, 'whatsapp'::text]) = '{}'::jsonb))) not valid;

alter table "public"."followups" validate constraint "followups_messages_channels";
