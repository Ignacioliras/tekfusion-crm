-- A lead inserted without owner goes to the caller, except when the caller is a
-- manager (the CSV importer leaves rows with no executive and no line owner
-- unassigned). Generated with `db diff`; its phantoms removed by hand
-- (drop extension pgjwt and the four views recreated without
-- security_invoker, CLAUDE.md §4): the views did not change.

drop trigger if exists "set_deal_sales_id_trigger" on "public"."deals";

CREATE TRIGGER set_deal_sales_id_trigger BEFORE INSERT ON public.deals FOR EACH ROW WHEN ((NOT public.is_manager())) EXECUTE FUNCTION public.set_sales_id_default();
