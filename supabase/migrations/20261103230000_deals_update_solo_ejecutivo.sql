-- deals_update requires manager or executive: a reader that still owns a lead
-- (demoted) never edits it (database-reviewer, Fase 3). Same rule as can_edit_deal.
drop policy if exists deals_update on public.deals;
-- A reader never edits a lead, even if it still owns one (e.g. demoted).
create policy deals_update on public.deals for update to authenticated
    using ((select public.is_manager())
        or ((select public.current_user_role()) = 'executive' and sales_id = (select public.current_sales_id())))
    with check ((select public.is_manager())
        or ((select public.current_user_role()) = 'executive' and sales_id = (select public.current_sales_id())));
