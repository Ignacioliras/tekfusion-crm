-- wa_connection_status(): the only thing a logged-in user reads about the
-- WhatsApp instance (connected, updated_at). wa_instance_status stays closed:
-- last_event keeps raw Evolution bodies (instance apikey). Written by hand
-- (db diff does not emit function grants; its residual only shows the usual
-- phantoms).
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.wa_connection_status()
 RETURNS TABLE(connected boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(s.connected, false), s.updated_at
    from (values (1)) one (n)
    left join lateral (
      select i.connected, i.updated_at
        from public.wa_instance_status i
       order by i.updated_at desc, i.id desc
       limit 1) s on true;
$function$
;

revoke execute on function public.wa_connection_status() from public, anon, service_role;
grant execute on function public.wa_connection_status() to authenticated;
