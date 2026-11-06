set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.wa_cliente_respondio()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d public.deals;
begin
  update public.followups f
     set status = 'cancelado', cancel_reason = 'Cliente respondió por WhatsApp'
   where f.deal_id = new.deal_id and f.status = 'pendiente';

  select * into d from public.deals where id = new.deal_id;
  if d.sales_id is not null then
    insert into public.alerts (type, recipient_sales_id, deal_id, message)
    values ('cliente_respondio', d.sales_id, d.id, format('El cliente respondió por WhatsApp en el lead «%s»', d.name))
    on conflict do nothing;
  end if;
  return null;
end;
$function$
;

CREATE TRIGGER wa_cliente_respondio AFTER INSERT ON public.wa_messages FOR EACH ROW WHEN (((new.direction = 'entrante'::public.wa_direction) AND (new.deal_id IS NOT NULL))) EXECUTE FUNCTION public.wa_cliente_respondio();

-- db diff does not emit function grants: trigger function, no API role calls it.
revoke execute on function public.wa_cliente_respondio() from public, anon, authenticated, service_role;
