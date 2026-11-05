--
-- TekFusion grants (Fase 2). Loaded after 10_tekfusion_tables.sql and
-- 11_tekfusion_policies.sql, so it can name the new tables and functions.
-- anon keeps init_state only; authenticated gets DML only (no TRUNCATE);
-- PostgREST writes a fixed set of sales columns. Checked by 14_rls_cobertura.
--

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on table public.init_state to anon;

-- RLS is the gate, but TRUNCATE ignores it: keep authenticated to DML only.
revoke truncate, references, trigger on all tables in schema public from authenticated;

grant select, insert, update, delete on table public.business_lines to authenticated;
grant all on table public.business_lines to service_role;
grant select, insert, update, delete on table public.lost_reasons to authenticated;
grant all on table public.lost_reasons to service_role;
grant select, insert, update, delete on table public.sales_absences to authenticated;
grant all on table public.sales_absences to service_role;
-- Only the system writes the audit trail (default privileges would grant DML).
revoke all on table public.audit_log from authenticated;
grant select on table public.audit_log to authenticated;
grant all on table public.audit_log to service_role;
grant all on sequence public.audit_log_id_seq to service_role;
grant all on sequence public.lost_reasons_id_seq to authenticated, service_role;
grant all on sequence public.sales_absences_id_seq to authenticated, service_role;

-- sales: users are created and edited through the "users" Edge Function
-- (service_role). Through PostgREST, authenticated can only write the profile
-- columns plus the three the protect_sales_columns trigger guards; email,
-- user_id and secondary_emails stay out of reach.
revoke update on table public.sales from authenticated;
-- disabled is not here: deactivation ("Dar de baja") and reactivation go
-- through the users Edge Function, which bans/unbans in Auth and writes audit_log.
grant update (first_name, last_name, avatar, signature, whatsapp_phone, role, administrator)
    on table public.sales to authenticated;

-- Helpers and RPCs: never for anon or PUBLIC.
revoke execute on function public.take_deal(bigint) from public, anon;
revoke execute on function public.offboard_sale(bigint, bigint) from public, anon, authenticated;
grant execute on function public.offboard_sale(bigint, bigint) to service_role;
-- log_export: any signed-in user may call it; the function itself lets only managers in.
revoke execute on function public.log_export(text, integer, jsonb) from public, anon;
grant execute on function public.log_export(text, integer, jsonb) to authenticated, service_role;
revoke execute on function public.can_read_attachment(text) from public, anon;
grant execute on function public.can_read_attachment(text) to authenticated, service_role;
revoke execute on function public.can_write_attachment(text) from public, anon;
grant execute on function public.can_write_attachment(text) to authenticated, service_role;
revoke execute on function public.current_sales_id() from public, anon;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_manager() from public, anon;
revoke execute on function public.is_internal_user() from public, anon;
revoke execute on function public.can_edit_deal(bigint) from public, anon;
revoke execute on function public.can_edit_contact(bigint) from public, anon;
grant execute on function public.take_deal(bigint) to authenticated, service_role;
grant execute on function public.current_sales_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_manager() to authenticated, service_role;
grant execute on function public.is_internal_user() to authenticated, service_role;
grant execute on function public.can_edit_deal(bigint) to authenticated, service_role;
grant execute on function public.can_edit_contact(bigint) to authenticated, service_role;

-- Fase 3. Default privileges would grant authenticated everything (TRUNCATE
-- included) on new tables: spell out each one. quotes and followups are never
-- deleted; alerts are written by the system and their recipient can only set
-- read_at.
revoke all on table public.quotes, public.followups, public.alerts, public.templates, public.quick_replies from authenticated;
grant select, insert, update on table public.quotes, public.followups to authenticated;
grant select on table public.alerts to authenticated;
grant update (read_at) on table public.alerts to authenticated;
grant select, insert, update, delete on table public.templates, public.quick_replies to authenticated;
grant all on table public.quotes, public.followups, public.alerts, public.templates, public.quick_replies to service_role;
revoke all on sequence public.alerts_id_seq from authenticated;
grant all on sequence public.alerts_id_seq to service_role;
grant all on sequence public.quotes_id_seq, public.followups_id_seq, public.templates_id_seq, public.quick_replies_id_seq
    to authenticated, service_role;
revoke execute on function public.guard_deal_child() from public, anon;
revoke all on table public.send_queue from authenticated, anon;
grant select on table public.send_queue to authenticated;
grant all on table public.send_queue to service_role;
revoke all on sequence public.send_queue_id_seq from authenticated, anon;
grant all on sequence public.send_queue_id_seq to service_role;
revoke execute on function public.send_quote(bigint, public.send_channel[]) from public, anon;
grant execute on function public.send_quote(bigint, public.send_channel[]) to authenticated, service_role;
revoke execute on function public.log_deal_changes() from public, anon;
revoke execute on function public.guard_deal_closing() from public, anon;
revoke execute on function public.set_quote_version() from public, anon;
