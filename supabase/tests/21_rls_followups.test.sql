-- Seguimientos (docs/08): se ven con el lead; los programa, ajusta y cancela
-- gerencia o el ejecutivo dueño; cancelar es un update, nunca un delete.
begin;
select plan(16);

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
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego;
create temp table f as
select
  (select min(d.id) from public.deals d where d.sales_id = (select camila from fx) and d.stage = 'cotizado') as own_deal,
  (select min(d.id) from public.deals d where d.sales_id = (select diego from fx) and d.stage = 'cotizado') as foreign_deal,
  (select min(x.id) from public.followups x join public.deals d on d.id = x.deal_id
    where d.sales_id = (select camila from fx) and x.status = 'pendiente') as own_followup,
  (select min(x.id) from public.followups x join public.deals d on d.id = x.deal_id
    where d.sales_id = (select diego from fx) and x.status = 'pendiente') as foreign_followup,
  (select count(*) from public.followups x join public.deals d on d.id = x.deal_id where d.sales_id = (select camila from fx)) as camila_followups;
grant select on fx, f to authenticated;

-- Lectura ----------------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select ok((select camila_followups from f) > 0 and (select own_followup from f) is not null, 'el seed deja seguimientos pendientes a Camila');
select is((select count(*) from public.followups), (select camila_followups from f),
  'ejecutivo ve solo los seguimientos de sus leads');
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from public.followups), 20::bigint, 'gerencia ve todos los seguimientos');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.followups), 20::bigint, 'lector ve todos los seguimientos');
update public.followups set status = 'cancelado', cancel_reason = 'lector' where id = (select own_followup from f);
reset role;
select is((select status from public.followups where id = (select own_followup from f)), 'pendiente'::public.followup_status,
  'lector no modifica seguimientos');

-- Escritura del ejecutivo -------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
update public.followups set status = 'cancelado', cancel_reason = 'Cliente pidió esperar' where id = (select own_followup from f);
update public.followups set status = 'cancelado', cancel_reason = 'ajeno' where id = (select foreign_followup from f);
select lives_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels, mode) values (%s, 3, now() + interval ''10 days'', ''{whatsapp}'', ''recordatorio'')',
    (select own_deal from f)), 'ejecutivo programa un seguimiento en su lead');
select throws_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels) values (%s, 3, now(), ''{correo}'')',
    (select foreign_deal from f)), '42501', null, 'ejecutivo no programa seguimientos en un lead ajeno');
select throws_ok(format('update public.followups set deal_id = (select max(id) from public.deals where sales_id = %s) where id = %s',
    (select camila from fx), (select own_followup from f)), '42501', null, 'ejecutivo no mueve un seguimiento a otro lead');
select throws_ok(format('delete from public.followups where id = %s', (select own_followup from f)),
  '42501', null, 'nadie borra seguimientos (cancelar es un update)');
reset role;
select is((select status from public.followups where id = (select own_followup from f)), 'cancelado'::public.followup_status,
  'ejecutivo cancela un seguimiento de su lead');
select is((select status from public.followups where id = (select foreign_followup from f)), 'pendiente'::public.followup_status,
  'ejecutivo no cancela el seguimiento de un lead ajeno');

-- Restricciones -------------------------------------------------------------------
select throws_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels) values (%s, 4, now(), ''{}'')', (select own_deal from f)),
  '23514', null, 'un seguimiento tiene al menos un canal');
select throws_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels, status) values (%s, 4, now(), ''{correo}'', ''enviado'')', (select own_deal from f)),
  '23514', null, 'un seguimiento enviado tiene fecha de envío');
select throws_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels, cancel_reason) values (%s, 4, now(), ''{correo}'', ''x'')', (select own_deal from f)),
  '23514', null, 'solo un seguimiento cancelado tiene motivo de cancelación');
select throws_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels, job_id) values (%s, 4, now(), ''{correo}'', %L)',
    (select own_deal from f), (select job_id from public.followups where job_id is not null limit 1)),
  '23505', null, 'job_id es único: un reintento de n8n no duplica el envío');
select throws_ok(format('insert into public.followups (deal_id, step, scheduled_at, channels) values (%s, 0, now(), ''{correo}'')', (select own_deal from f)),
  '23514', null, 'los pasos parten en 1');

select * from finish();
rollback;
