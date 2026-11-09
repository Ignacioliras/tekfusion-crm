set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_deal_closed_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.stage not in ('ganado', 'perdido', 'archivado') then
    new.closed_at := null;
  elsif tg_op = 'UPDATE' then
    if new.stage is distinct from old.stage then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$function$
;
