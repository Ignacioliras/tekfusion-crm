-- Ficha del lead (RF-05/06): "Enviar cotización" (send_quote) encola el envío,
-- pasa el lead a cotizado y programa la cadencia; los cambios de etapa y de
-- ejecutivo quedan en audit_log para la línea de tiempo; ganado exige monto y
-- perdido exige motivo.
begin;
select plan(22);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego,
  (select min(id) from public.deals where stage = 'contactado'
     and sales_id = (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl')) as deal,
  (select min(id) from public.deals where stage = 'cotizado'
     and sales_id = (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl')
     and exists (select 1 from public.followups f where f.deal_id = deals.id and f.status = 'pendiente')) as quoted_deal,
  0::bigint as quote;
grant select on fx to authenticated;

-- Camila sube una cotización a su lead "contactado" y la envía -----------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
insert into public.quotes (deal_id, amount, pdf_path)
  values ((select deal from fx), 2500000, format('deals/%s/00000000-0000-4000-8000-0000000000aa.pdf', (select deal from fx)));
reset role;
update fx set quote = (select max(id) from public.quotes where deal_id = (select deal from fx));

select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select throws_ok(format('select public.send_quote(%s, ''{correo}'')', (select quote from fx)), '42501', null,
  'otro ejecutivo no envía la cotización de un lead ajeno');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(format('select public.send_quote(%s, ''{correo}'')', (select quote from fx)), '42501', null,
  'lector no envía cotizaciones');
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok(format('select public.send_quote(%s, ''{}'')', (select quote from fx)), '22023', null,
  'enviar exige al menos un canal');
select lives_ok(format('select public.send_quote(%s, ''{correo,whatsapp}'')', (select quote from fx)),
  'el ejecutivo envía la cotización de su lead');
select throws_ok(format('select public.send_quote(%s, ''{correo}'')', (select quote from fx)), '23505', null,
  'la misma cotización no se encola dos veces');
select is((select string_agg(channel::text, ',' order by channel) from public.send_queue where quote_id = (select quote from fx)),
  'correo,whatsapp', 'queda una fila en la cola por canal, visible para el ejecutivo');
select throws_ok(format('insert into public.send_queue (deal_id, quote_id, channel) values (%s, %s, ''correo'')', (select deal from fx), (select quote from fx)),
  '42501', null, 'nadie escribe la cola a mano (solo send_quote y el sistema)');
select is((select stage from public.deals where id = (select deal from fx)), 'cotizado', 'el lead pasa a cotizado');
select is((select amount from public.deals where id = (select deal from fx)), 2500000::bigint, 'el monto del lead es el de la cotización');
select is((select array_agg(step order by step) from public.followups where deal_id = (select deal from fx) and status = 'pendiente'),
  array[1, 2, 3]::smallint[], 'se programa la cadencia por defecto (3 pasos)');
select is(
  (select count(*) from public.followups where deal_id = (select deal from fx) and status = 'pendiente'
      and (extract(isodow from scheduled_at at time zone 'America/Santiago') between 1 and 5)
      and (scheduled_at at time zone 'America/Santiago')::time = '10:00'
      and channels = '{correo,whatsapp}' and template_id is not null),
  3::bigint, 'los seguimientos caen en día hábil a las 10:00, con los canales elegidos y una plantilla');
select is((select actor_sales_id from public.audit_log where deal_id = (select deal from fx) and action = 'deal.stage_changed'),
  (select camila from fx), 'el cambio de etapa queda en la línea de tiempo, firmado por quien lo hizo');
reset role;

select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select is((select count(*) from public.send_queue where deal_id = (select deal from fx)), 0::bigint, 'otro ejecutivo no ve la cola de un lead ajeno');
select is((select count(*) from public.audit_log where deal_id = (select deal from fx)), 0::bigint, 'ni su historial');
reset role;

-- Nueva versión sobre un lead ya cotizado ------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
insert into public.quotes (deal_id, amount, pdf_path)
  values ((select quoted_deal from fx), 900000, format('deals/%s/00000000-0000-4000-8000-0000000000bb.pdf', (select quoted_deal from fx)));
select throws_ok(format('select public.send_quote(%s, ''{correo}'')',
    (select min(id) from public.quotes where deal_id = (select quoted_deal from fx))), '22023', null,
  'una versión anterior (historial) ya no se envía');
select lives_ok(format('select public.send_quote(%s, ''{whatsapp}'')',
    (select max(id) from public.quotes where deal_id = (select quoted_deal from fx))), 'la versión nueva se envía');
reset role;
select is((select count(*) from public.followups where deal_id = (select quoted_deal from fx) and status = 'cancelado'
    and cancel_reason = 'Nueva cotización enviada'), 1::bigint,
  'los seguimientos pendientes de la versión anterior se cancelan');

-- Gerencia reasigna; cierre con monto y motivo -----------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
update public.deals set sales_id = (select diego from fx) where id = (select deal from fx);
select is((select details from public.audit_log where deal_id = (select deal from fx) and action = 'deal.reassigned'),
  jsonb_build_object('from', (select camila from fx), 'to', (select diego from fx)), 'la reasignación queda en la línea de tiempo');
select throws_ok(format('update public.deals set stage = ''ganado'' where id = %s', (select deal from fx)), '23514', null,
  'ganado exige monto final');
select lives_ok(format('update public.deals set stage = ''ganado'', won_amount = 2400000 where id = %s', (select deal from fx)),
  'ganado con monto final');
select throws_ok(format('update public.deals set stage = ''perdido'' where id = %s', (select quoted_deal from fx)), '23514', null,
  'perdido exige motivo');
select lives_ok(format('update public.deals set stage = ''perdido'', lost_reason_id = (select min(id) from public.lost_reasons) where id = %s', (select quoted_deal from fx)),
  'perdido con motivo');
reset role;

select * from finish();
rollback;
