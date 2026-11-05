-- fase-3/ajustes (T3 de la cola nocturna 2026-11-04-b): registro de cada
-- export CSV con su autor (docs/08). Written by hand: db diff emits no grants.
-- CSV export log (docs/08: exports are for managers only and recorded with
-- their author). The interface calls it after building the file.
CREATE OR REPLACE FUNCTION "public"."log_export"("resource" "text", "row_count" integer, "filters" "jsonb") RETURNS "public"."audit_log"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  entry public.audit_log;
begin
  if not public.is_manager() then
    raise exception 'only managers export data' using errcode = '42501';
  end if;
  if resource is null or resource not in ('deals', 'contacts', 'companies', 'sales', 'tasks') then
    raise exception 'unknown resource %', resource using errcode = '22023';
  end if;
  if row_count is null or row_count < 0 then
    raise exception 'row_count must be zero or more' using errcode = '22023';
  end if;
  insert into public.audit_log (actor_sales_id, action, details)
  values (public.current_sales_id(), 'export',
          jsonb_build_object('resource', resource, 'rows', row_count, 'filters', coalesce(filters, '{}'::jsonb)))
  returning * into entry;
  return entry;
end;
$$;

revoke execute on function public.log_export(text, integer, jsonb) from public, anon;
grant execute on function public.log_export(text, integer, jsonb) to authenticated, service_role;
