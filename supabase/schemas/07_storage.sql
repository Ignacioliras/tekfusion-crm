--
-- Storage
-- The attachments bucket policies live at the end of 11_tekfusion_policies.sql:
-- they use the RLS helpers, which do not exist yet when this file loads.
--
-- The bucket is private (docs/08, Fase 2, 2026-11-03): every read goes through
-- a signed URL (60 min) that the attachments_select policy authorizes. Buckets
-- are rows, not schema: db diff ignores this, the migration carries it by hand.
--

insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;
